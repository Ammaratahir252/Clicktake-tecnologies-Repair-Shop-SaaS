import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import Subscription from '@/models/subscription.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'subscriptions');
}

// GET /api/admin/subscriptions
// Returns all tenants merged with their subscription data.
// For tenants without a subscription record, returns derived data from tenant.plan.
export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const [tenants, subscriptions] = await Promise.all([
      Tenant.find().select('name subdomain plan isActive email createdAt').sort({ createdAt: -1 }).lean(),
      Subscription.find().lean(),
    ]);

    const subMap = new Map<string, any>();
    for (const s of subscriptions) {
      subMap.set(String(s.tenantId), s);
    }

    const now = Date.now();

    const result = (tenants as any[]).map((t) => {
      const sub = subMap.get(String(t._id));
      const status = sub?.status ?? (t.isActive ? 'active' : 'suspended');
      const nextBillingDate = sub?.nextBillingDate ?? null;
      const isOverdue = status === 'active' && !!nextBillingDate && new Date(nextBillingDate).getTime() < now;
      const daysUntilRenewal = nextBillingDate
        ? Math.ceil((new Date(nextBillingDate).getTime() - now) / (1000 * 60 * 60 * 24))
        : null;
      return {
        _id:             String(t._id),
        tenantName:      t.name,
        tenantSubdomain: t.subdomain,
        tenantEmail:     t.email,
        tenantIsActive:  t.isActive,
        tenantCreatedAt: t.createdAt,
        // subscription fields (from DB record or derived)
        subscriptionId:  sub ? String(sub._id) : null,
        plan:            sub?.plan            ?? t.plan ?? 'free',
        status,
        billingCycle:    sub?.billingCycle    ?? 'monthly',
        amount:          sub?.amount          ?? 0,
        currency:        sub?.currency        ?? 'PKR',
        startedAt:       sub?.startedAt       ?? t.createdAt,
        nextBillingDate,
        cancelledAt:     sub?.cancelledAt     ?? null,
        notes:           sub?.notes           ?? '',
        hasDedicatedRecord: !!sub,
        isOverdue,
        daysUntilRenewal,
      };
    });

    return sendResponse(true, 'Subscriptions fetched', result);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
