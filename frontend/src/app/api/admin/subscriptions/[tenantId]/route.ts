import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import Subscription from '@/models/subscription.model';
import { AuditLog } from '@/models/auditLog.model';
import { sendResponse } from '@/utils/apiResponse';
import { sendEmail, emailSubscriptionChanged, createNotification } from '@/lib/notifications';
import User from '@/models/user.model';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'subscriptions');
}

// PATCH /api/admin/subscriptions/[tenantId]
// Upserts the subscription record for a tenant and syncs tenant.plan
export async function PATCH(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { tenantId } = params;
    const body = await req.json();
    const adminId = req.headers.get('x-user-id') || 'unknown';

    const allowedFields = ['plan', 'status', 'billingCycle', 'amount', 'currency', 'nextBillingDate', 'cancelledAt', 'notes'];
    const update: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) update[key] = body[key];
    }

    // If cancelling, set cancelledAt timestamp
    if (body.status === 'cancelled' && !update.cancelledAt) {
      update.cancelledAt = new Date();
    }

    const sub = await Subscription.findOneAndUpdate(
      { tenantId },
      { $set: { ...update, tenantId } },
      { new: true, upsert: true, runValidators: false }
    ).lean();

    // Sync plan + isActive status back to Tenant model
    const tenantUpdate: Record<string, any> = {};
    if (update.plan)   tenantUpdate.plan     = update.plan;
    if (update.status) tenantUpdate.isActive = update.status === 'active' || update.status === 'trial';

    if (Object.keys(tenantUpdate).length > 0) {
      await Tenant.findByIdAndUpdate(tenantId, { $set: tenantUpdate });
    }

    await AuditLog.create({
      tenantId,
      userId:   adminId,
      action:   'SETTINGS_UPDATED',
      entity:   'subscription',
      entityId: tenantId,
      details:  update,
    });

    if (update.plan || update.status) {
      const finalPlan = (sub as any)?.plan ?? update.plan ?? 'free';
      const finalStatus = (sub as any)?.status ?? update.status ?? 'active';
      const [owner, tenantDoc] = await Promise.all([
        User.findOne({ tenantId, role: 'owner' }).select('name email _id').lean() as Promise<any>,
        Tenant.findById(tenantId).select('name').lean() as Promise<any>,
      ]);
      if (owner?.email) {
        sendEmail(
          owner.email,
          'Your Subscription Has Changed',
          emailSubscriptionChanged(owner.name || 'there', tenantDoc?.name || 'your shop', finalPlan, finalStatus)
        ).catch(() => {});
        createNotification({
          tenantId,
          recipientUserId: String(owner._id),
          type: 'subscription_changed',
          title: 'Your Subscription Has Changed',
          message: `Plan: ${finalPlan} · Status: ${finalStatus}`,
        }).catch(() => {});
      }
    }

    return sendResponse(true, 'Subscription updated', sub);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

// DELETE /api/admin/subscriptions/[tenantId]
// Hard-cancels the subscription and suspends the tenant
export async function DELETE(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { tenantId } = params;
    const adminId = req.headers.get('x-user-id') || 'unknown';

    await Promise.all([
      Subscription.findOneAndUpdate(
        { tenantId },
        { $set: { status: 'cancelled', cancelledAt: new Date() } },
        { upsert: true }
      ),
      Tenant.findByIdAndUpdate(tenantId, { $set: { isActive: false } }),
    ]);

    await AuditLog.create({
      tenantId,
      userId:   adminId,
      action:   'TENANT_SUSPEND',
      entity:   'subscription',
      entityId: tenantId,
    });

    return sendResponse(true, 'Subscription cancelled and tenant suspended', null);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
