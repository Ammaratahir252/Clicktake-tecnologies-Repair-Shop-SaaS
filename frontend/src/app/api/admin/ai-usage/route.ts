import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import AIUsageLog from '@/models/aiUsageLog.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';

// GET /api/admin/ai-usage — today/month spend totals + per-tenant breakdown
export async function GET(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, byTenant] = await Promise.all([
      AIUsageLog.aggregate([{ $match: { createdAt: { $gte: dayStart } } }, { $group: { _id: null, total: { $sum: '$estimatedCostUsd' }, count: { $sum: 1 } } }]),
      AIUsageLog.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$estimatedCostUsd' }, count: { $sum: 1 } } }]),
      AIUsageLog.aggregate([
        { $match: { createdAt: { $gte: monthStart }, tenantId: { $ne: null } } },
        { $group: { _id: '$tenantId', total: { $sum: '$estimatedCostUsd' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 20 },
        { $lookup: { from: 'tenants', localField: '_id', foreignField: '_id', as: 'tenant' } },
        { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
        { $project: { tenantName: '$tenant.name', total: 1, count: 1 } },
      ]),
    ]);

    return sendResponse(true, 'AI usage fetched', {
      todaySpendUsd: todayAgg[0]?.total ?? 0,
      todayRequests: todayAgg[0]?.count ?? 0,
      monthSpendUsd: monthAgg[0]?.total ?? 0,
      monthRequests: monthAgg[0]?.count ?? 0,
      byTenant,
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
