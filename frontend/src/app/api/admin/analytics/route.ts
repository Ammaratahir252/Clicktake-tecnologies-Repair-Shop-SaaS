import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import User from '@/models/user.model';
import Tenant from '@/models/tenant.model';
import Payment from '@/models/payment.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'analytics');
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? 'month';

    const since = new Date();
    if (period === 'week')         since.setDate(since.getDate() - 7);
    else if (period === 'quarter') since.setDate(since.getDate() - 90);
    else                           since.setDate(since.getDate() - 30);

    const [tenants, ticketAgg, revenueAgg, userAgg] = await Promise.all([
      Tenant.find().select('name subdomain plan isActive createdAt').lean(),
      Ticket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$tenantId', tickets: { $sum: 1 } } },
      ]),
      // Real per-shop revenue: only actually-collected customer payments
      // (kind: 'invoice', status: 'completed') — NOT a raw sum of every ticket's
      // quoted estimateAmount, which would include unpaid/cancelled/in-progress
      // tickets and wildly overstate what a shop actually earned.
      Payment.aggregate([
        { $match: { kind: 'invoice', status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: '$tenantId', revenue: { $sum: '$amount' } } },
      ]),
      User.aggregate([
        { $match: { role: { $ne: 'super_admin' } } },
        { $group: { _id: '$tenantId', users: { $sum: 1 } } },
      ]),
    ]);

    const ticketMap: Record<string, number> = {};
    ticketAgg.forEach((t) => {
      ticketMap[String(t._id)] = t.tickets;
    });

    const revenueMap: Record<string, number> = {};
    revenueAgg.forEach((r) => {
      revenueMap[String(r._id)] = r.revenue;
    });

    const userMap: Record<string, number> = {};
    userAgg.forEach((u) => {
      userMap[String(u._id)] = u.users;
    });

    const stats = (tenants as any[]).map((t) => {
      const id = String(t._id);
      return {
        _id:       id,
        name:      t.name,
        subdomain: t.subdomain,
        plan:      t.plan,
        isActive:  t.isActive,
        tickets:   ticketMap[id]   ?? 0,
        revenue:   revenueMap[id]  ?? 0,
        users:     userMap[id]     ?? 0,
        createdAt: t.createdAt,
      };
    });

    return sendResponse(true, 'Analytics fetched', stats);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
