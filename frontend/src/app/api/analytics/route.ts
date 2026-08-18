import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import User from '@/models/user.model';
import Customer from '@/models/customer.model';
import Payment from '@/models/payment.model';
import TimeSession from '@/models/timeSession.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

// Reads the caller's tenant/role from verified request headers on every call —
// must never be statically prerendered at build time (no headers exist then).
export const dynamic = 'force-dynamic';

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
    if (!['owner', 'manager', 'super_admin'].includes(role)) {
      return sendResponse(false, 'Forbidden', null, 403);
    }

    // Super admin can inspect any shop's analytics via ?tenantId=, without impersonating.
    const requestedTenantId = role === 'super_admin'
      ? (new URL(req.url).searchParams.get('tenantId') || tenantId)
      : tenantId;

    if (!requestedTenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const tid = new mongoose.Types.ObjectId(requestedTenantId);

    const [tickets, staffCount, customerCount, topTechs, monthlyRevenue, collectedRevenueAgg, technicianHours] = await Promise.all([
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
      // Real, actually-collected revenue (completed customer payments) — distinct
      // from `totalRevenue`/`monthly[].revenue` above, which sum every ticket's
      // *quoted* estimateAmount regardless of whether it was ever paid.
      Payment.aggregate([
        { $match: { tenantId: tid, kind: 'invoice', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Aggregate technician working hours from the start/stop timer (time-sessions) —
      // only completed sessions (endedAt set) count toward the total.
      TimeSession.aggregate([
        { $match: { tenantId: tid, endedAt: { $ne: null } } },
        {
          $group: {
            _id: '$technicianId',
            totalSeconds: { $sum: '$durationSeconds' },
            sessions: { $sum: 1 },
          },
        },
        { $sort: { totalSeconds: -1 } },
        { $limit: 10 },
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
            name: '$user.name',
            totalSeconds: 1,
            sessions: 1,
          },
        },
      ]),
    ]);

    const collectedRevenue = (collectedRevenueAgg as any[])[0]?.total ?? 0;

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
      collectedRevenue,
      staffCount,
      customerCount,
      statusCounts,
      topTechs:       topTechs as any[],
      technicianHours: technicianHours as any[],
      monthly,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
