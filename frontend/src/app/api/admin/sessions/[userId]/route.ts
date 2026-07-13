import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { forceLogoutUser } from '@/lib/sessions';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';

// POST /api/admin/sessions/[userId] — force-logout a single user (revokes sessions + bumps tokenVersion)
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!canAccess(req, 'settings') && !canAccess(req, 'users')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    await forceLogoutUser(params.userId);

    const adminId = req.headers.get('x-user-id') || 'unknown';
    if (adminId !== 'unknown') {
      createAuditLog({
        tenantId: params.userId,
        userId: adminId,
        action: AUDIT_ACTIONS.USER_DEACTIVATED,
        entity: 'user',
        entityId: params.userId,
        details: { reason: 'force-logout' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    return sendResponse(true, 'User signed out of all sessions');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
