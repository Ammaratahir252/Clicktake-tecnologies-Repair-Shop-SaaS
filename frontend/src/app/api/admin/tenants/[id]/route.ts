import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import User from '@/models/user.model';
import Lead from '@/models/lead.model';
import Subscription from '@/models/subscription.model';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailAccountDeleted } from '@/lib/notifications';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'tenants');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const tenant = await Tenant.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: false }
    ).lean();
    if (!tenant) return sendResponse(false, 'Tenant not found', null, 404);
    return sendResponse(true, 'Tenant updated', tenant);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const tenant = await Tenant.findById(params.id).lean() as any;
    if (!tenant) return sendResponse(false, 'Tenant not found', null, 404);

    const superAdminId = req.headers.get('x-user-id') || 'unknown';

    const [ticketCount, customerCount, userCount, leadCount] = await Promise.all([
      Ticket.deleteMany({ tenantId: params.id }).then(r => r.deletedCount),
      (Customer as any).deleteMany({ tenantId: params.id }).then((r: any) => r.deletedCount),
      User.deleteMany({ tenantId: params.id }).then(r => r.deletedCount),
      Lead.deleteMany({ tenantId: params.id }).then(r => r.deletedCount),
    ]);
    await Subscription.deleteOne({ tenantId: params.id });
    await Tenant.findByIdAndDelete(params.id);

    if (superAdminId !== 'unknown') {
      createAuditLog({
        tenantId: params.id,
        userId: superAdminId,
        action: AUDIT_ACTIONS.TENANT_DELETED,
        entity: 'tenant',
        entityId: params.id,
        details: {
          tenantName: tenant.name,
          cascaded: { ticketCount, customerCount, userCount, leadCount },
        },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    if (tenant.email) {
      sendEmail(
        tenant.email,
        'Your Shop Account Has Been Closed',
        emailAccountDeleted(tenant.ownerName || tenant.name, 'shop')
      ).catch(() => {});
    }

    return sendResponse(true, 'Tenant and all related data permanently deleted', {
      cascaded: { ticketCount, customerCount, userCount, leadCount },
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
