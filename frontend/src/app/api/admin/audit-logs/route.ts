import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
import User from '@/models/user.model';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'audit');
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') ?? '';
    const search = searchParams.get('search') ?? '';
    const userId = searchParams.get('userId') ?? '';
    const page   = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip   = (page - 1) * limit;

    const query: any = {};
    if (action && action !== 'All') query.action = action;
    if (userId && userId.length === 24) query.userId = userId;
    if (search.trim()) {
      const term = search.trim();
      const orConditions: any[] = [
        { entity:    { $regex: term, $options: 'i' } },
        { ipAddress: { $regex: term, $options: 'i' } },
      ];
      // The search box is labeled "user ID, entity, tenant, or IP" — actually
      // honor that by also matching a raw ObjectId, or a user/tenant name/email.
      if (/^[0-9a-fA-F]{24}$/.test(term)) {
        orConditions.push({ userId: term }, { tenantId: term }, { entityId: term });
      }
      const [matchingUsers, matchingTenants] = await Promise.all([
        User.find({ $or: [{ name: { $regex: term, $options: 'i' } }, { email: { $regex: term, $options: 'i' } }] })
          .select('_id').limit(50).lean(),
        Tenant.find({ name: { $regex: term, $options: 'i' } }).select('_id').limit(50).lean(),
      ]);
      if (matchingUsers.length)   orConditions.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
      if (matchingTenants.length) orConditions.push({ tenantId: { $in: matchingTenants.map((t) => t._id) } });
      query.$or = orConditions;
    }

    const [logsRaw, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .populate('tenantId', 'name')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const logs = (logsRaw as any[]).map((log) => ({
      ...log,
      userName:   log.userId && typeof log.userId === 'object' ? log.userId.name : undefined,
      userId:     log.userId && typeof log.userId === 'object' ? String(log.userId._id) : log.userId,
      tenantName: log.tenantId && typeof log.tenantId === 'object' ? log.tenantId.name : log.tenantName,
      tenantId:   log.tenantId && typeof log.tenantId === 'object' ? String(log.tenantId._id) : log.tenantId,
    }));

    return sendResponse(true, 'Audit logs fetched', { logs, total, page, limit });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
