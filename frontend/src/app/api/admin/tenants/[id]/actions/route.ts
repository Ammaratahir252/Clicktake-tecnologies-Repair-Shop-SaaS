import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import User from '@/models/user.model';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import Lead from '@/models/lead.model';
import Subscription from '@/models/subscription.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailAdminNotice } from '@/lib/notifications';
import { forceLogoutTenant } from '@/lib/sessions';
import { Role } from '@/lib/enums';

// POST /api/admin/tenants/[id]/actions   body: { type, payload? }
// Bundles the less-common, higher-blast-radius tenant operations behind one
// endpoint so each new one doesn't need its own route file.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!canAccess(req, 'tenants')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  const adminId = req.headers.get('x-user-id') || 'unknown';
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    const { type, payload } = await req.json();
    const tenant = await Tenant.findById(params.id);
    if (!tenant) return sendResponse(false, 'Tenant not found', null, 404);

    const log = (action: string, details?: Record<string, any>) => {
      if (adminId === 'unknown') return;
      createAuditLog({ tenantId: params.id, userId: adminId, action, entity: 'tenant', entityId: params.id, details, ipAddress: ip });
    };

    switch (type) {
      case 'forcePasswordReset': {
        const result = await User.updateMany({ tenantId: params.id }, { $set: { forcePasswordReset: true } });
        await forceLogoutTenant(params.id);
        log(AUDIT_ACTIONS.SETTINGS_UPDATED, { action: 'forcePasswordReset', affected: result.modifiedCount });
        return sendResponse(true, `${result.modifiedCount} account(s) must reset their password on next login`, { affected: result.modifiedCount });
      }

      case 'freezeSubscription': {
        await Subscription.findOneAndUpdate({ tenantId: params.id }, { $set: { status: 'suspended' } }, { upsert: true });
        await Tenant.findByIdAndUpdate(params.id, { isActive: false });
        log(AUDIT_ACTIONS.SUBSCRIPTION_CHANGED, { action: 'freeze' });
        return sendResponse(true, 'Subscription frozen and tenant suspended');
      }

      case 'forceTrialEnd': {
        await Subscription.findOneAndUpdate(
          { tenantId: params.id },
          { $set: { status: 'active', plan: 'free' } },
          { upsert: true }
        );
        log(AUDIT_ACTIONS.SUBSCRIPTION_CHANGED, { action: 'forceTrialEnd' });
        return sendResponse(true, 'Trial ended — tenant moved to the free plan');
      }

      case 'transferOwnership': {
        const { newOwnerUserId } = payload || {};
        if (!newOwnerUserId) return sendResponse(false, 'newOwnerUserId is required', null, 400);
        const newOwner = await User.findOne({ _id: newOwnerUserId, tenantId: params.id });
        if (!newOwner) return sendResponse(false, 'That user does not belong to this tenant', null, 404);

        const oldOwner = await User.findOne({ tenantId: params.id, role: 'owner' });
        if (oldOwner && String(oldOwner._id) !== String(newOwner._id)) {
          oldOwner.role = Role.manager;
          await oldOwner.save();
        }
        newOwner.role = Role.owner;
        await newOwner.save();
        await Tenant.findByIdAndUpdate(params.id, { ownerName: newOwner.name, email: newOwner.email });

        log(AUDIT_ACTIONS.USER_ROLE_UPDATED, { action: 'transferOwnership', newOwnerUserId });
        if (newOwner.email) {
          sendEmail(newOwner.email, 'You Are Now the Shop Owner', emailAdminNotice(newOwner.name, `Ownership of ${tenant.name} has been transferred to you by the platform administrator.`)).catch(() => {});
        }
        return sendResponse(true, `Ownership transferred to ${newOwner.name}`);
      }

      case 'resetData': {
        // Destructive: wipes this tenant's tickets, customers, and leads but keeps
        // the tenant record, its users, and its subscription. Requires the caller
        // to echo the tenant name back as a confirmation string.
        const { confirmName } = payload || {};
        if (confirmName !== tenant.name) {
          return sendResponse(false, 'Confirmation text does not match the tenant name', null, 400);
        }
        const [ticketCount, customerCount, leadCount] = await Promise.all([
          Ticket.deleteMany({ tenantId: params.id }).then((r) => r.deletedCount),
          (Customer as any).deleteMany({ tenantId: params.id }).then((r: any) => r.deletedCount),
          Lead.deleteMany({ tenantId: params.id }).then((r) => r.deletedCount),
        ]);
        log(AUDIT_ACTIONS.TENANT_DELETED, { action: 'resetData', cascaded: { ticketCount, customerCount, leadCount } });
        return sendResponse(true, 'Tenant operational data reset', { ticketCount, customerCount, leadCount });
      }

      default:
        return sendResponse(false, 'Unknown action type', null, 400);
    }
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
