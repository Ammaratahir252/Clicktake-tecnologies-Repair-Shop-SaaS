import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Customer from '@/models/customer.model';
import Ticket from '@/models/ticket.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'manager', 'frontdesk', 'super_admin'].includes(role)) {
      return sendResponse(false, 'Forbidden', null, 403);
    }

    const tid = new mongoose.Types.ObjectId(tenantId);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';

    const query: Record<string, unknown> = { tenantId: tid };
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    // Attach ticket counts
    const ticketAgg = await Ticket.aggregate([
      { $match: { tenantId: tid } },
      {
        $group: {
          _id: '$customerId',
          total:  { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                { $in: ['$status', ['received', 'diagnosed', 'estimate_sent', 'approved', 'in_repair', 'ready']] },
                1,
                0,
              ],
            },
          },
          lastTicket: { $max: '$createdAt' },
        },
      },
    ]);

    const ticketMap: Record<string, { total: number; active: number; lastTicket: Date }> = {};
    for (const t of ticketAgg) {
      ticketMap[String(t._id)] = { total: t.total, active: t.active, lastTicket: t.lastTicket };
    }

    const result = (customers as any[]).map((c) => ({
      ...c,
      totalTickets:  ticketMap[String(c._id)]?.total    ?? 0,
      activeTickets: ticketMap[String(c._id)]?.active   ?? 0,
      lastVisit:     ticketMap[String(c._id)]?.lastTicket ?? c.createdAt,
    }));

    return sendResponse(true, 'Customers fetched', result);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
