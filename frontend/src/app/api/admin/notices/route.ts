import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailAdminNotice, createNotification } from '@/lib/notifications';

import { isAdminTier } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return isAdminTier(req);
}

// POST /api/admin/notices
// body: { userId, tenantId, email, name, message }
// Emails the target user directly and, if they have an in-app account, creates a notification too.
export async function POST(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { userId, tenantId, email, name, message } = await req.json();
    if (!email || !message?.trim()) {
      return sendResponse(false, 'email and message are required', null, 400);
    }

    await sendEmail(email, 'Notice from Platform Admin', emailAdminNotice(name || 'there', message));

    if (userId && tenantId) {
      await createNotification({
        tenantId,
        recipientUserId: userId,
        type: 'admin_notice',
        title: 'Notice from Platform Admin',
        message,
      });
    }

    const superAdminId = req.headers.get('x-user-id') || 'unknown';
    if (superAdminId !== 'unknown') {
      createAuditLog({
        tenantId: tenantId || userId || superAdminId,
        userId: superAdminId,
        action: AUDIT_ACTIONS.NOTICE_SENT,
        entity: 'user',
        entityId: userId || undefined,
        details: { targetEmail: email, message },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    return sendResponse(true, 'Notice sent');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
