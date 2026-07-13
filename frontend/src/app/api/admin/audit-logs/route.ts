import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
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
      query.$or = [
        { entity:    { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
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
