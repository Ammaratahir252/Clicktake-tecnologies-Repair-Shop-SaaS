import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import User from '@/models/user.model';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const [tenants, ticketAgg, userAgg] = await Promise.all([
      Tenant.find().select('name subdomain plan isActive createdAt').lean(),
      Ticket.aggregate([
        {
          $group: {
            _id: '$tenantId',
            tickets: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$estimateAmount', 0] } },
          },
        },
      ]),
      User.aggregate([
        { $match: { role: { $ne: 'super_admin' } } },
        { $group: { _id: '$tenantId', users: { $sum: 1 } } },
      ]),
    ]);

    const ticketMap: Record<string, { tickets: number; revenue: number }> = {};
    ticketAgg.forEach((t) => {
      ticketMap[String(t._id)] = { tickets: t.tickets, revenue: t.revenue };
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
        tickets:   ticketMap[id]?.tickets ?? 0,
        revenue:   ticketMap[id]?.revenue ?? 0,
        users:     userMap[id]             ?? 0,
        createdAt: t.createdAt,
      };
    });

    return sendResponse(true, 'Analytics fetched', stats);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
