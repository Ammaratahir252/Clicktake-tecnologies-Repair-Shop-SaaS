import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { AuditLog } from '@/models/auditLog.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return sendResponse(false, 'tenantId is required', null, 400);

    const superAdminId = req.headers.get('x-user-id') || 'unknown';

    await AuditLog.create({
      tenantId,
      userId:    superAdminId,
      action:    'IMPERSONATE_START',
      entity:    'tenant',
      entityId:  tenantId,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return sendResponse(true, 'Impersonation started — logged in audit trail', { tenantId });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
