import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
import { sendResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const role = req.headers.get('x-role');
    const tenantId = req.headers.get('x-tenant-id');



    if (!tenantId || !role) {
      return sendResponse(false, 'Unauthorized', null, 401);
    }

    // Normalize role before comparing
    if (role.trim().toLowerCase() !== 'owner') {
      return sendResponse(false, 'You do not have permission to perform this action', null, 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query: any = { tenantId };
    if (action && action !== 'All') query.action = action;
    if (userId) query.userId = userId;

    const finalLimit = Math.min(limit, 100);
    const skip = (page - 1) * finalLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(finalLimit),
      AuditLog.countDocuments(query)
    ]);

    return sendResponse(true, 'Audit logs fetched successfully', {
      logs,
      total,
      page,
      limit: finalLimit
    });
  } catch (error: any) {
    return sendResponse(false, error.message || 'Failed to fetch audit logs', null, 500);
  }
}
