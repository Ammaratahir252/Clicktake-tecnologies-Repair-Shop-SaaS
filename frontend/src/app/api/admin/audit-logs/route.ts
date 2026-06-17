import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') ?? '';
    const search = searchParams.get('search') ?? '';
    const page   = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip   = (page - 1) * limit;

    const query: any = {};
    if (action && action !== 'All') query.action = action;
    if (search.trim()) {
      query.$or = [
        { userId:    { $regex: search, $options: 'i' } },
        { entity:    { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return sendResponse(true, 'Audit logs fetched', { logs, total, page, limit });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
