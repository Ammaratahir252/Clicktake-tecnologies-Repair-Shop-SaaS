import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import User from '@/models/user.model';
import Customer from '@/models/customer.model';
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
    if (!['owner', 'manager', 'super_admin'].includes(role)) {
      return sendResponse(false, 'Forbidden', null, 403);
    }

    const tid = new mongoose.Types.ObjectId(tenantId);

    const [tickets, staffCount, customerCount, topTechs, monthlyRevenue] = await Promise.all([
      Ticket.find({ tenantId: tid }).lean(),
      User.countDocuments({ tenantId: tid, role: { $in: ['technician', 'manager', 'frontdesk', 'driver', 'owner'] } }),
      Customer.countDocuments({ tenantId: tid }),
      Ticket.aggregate([
        { $match: { tenantId: tid, technicianId: { $ne: null } } },
        {
          $group: {
            _id: '$technicianId',
            tickets: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$estimateAmount', 0] } },
          },
        },
        { $sort: { tickets: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name:    '$user.name',
            tickets: 1,
            revenue: 1,
          },
        },
      ]),
      Ticket.aggregate([
        { $match: { tenantId: tid } },
        {
          $group: {
            _id: {
              year:  { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: { $ifNull: ['$estimateAmount', 0] } },
            tickets: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

    // Ticket status breakdown
    const statusCounts: Record<string, number> = {};
    let totalRevenue = 0;
    for (const t of tickets as any[]) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      totalRevenue += t.estimateAmount || 0;
    }

    // Monthly labels
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthly = (monthlyRevenue as any[]).map((m) => ({
      month:   MONTHS[m._id.month - 1],
      year:    m._id.year,
      revenue: m.revenue,
      tickets: m.tickets,
    }));

    return sendResponse(true, 'Analytics fetched', {
      totalTickets:   tickets.length,
      totalRevenue,
      staffCount,
      customerCount,
      statusCounts,
      topTechs:       topTechs as any[],
      monthly,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
