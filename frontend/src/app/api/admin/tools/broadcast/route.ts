import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import { sendEmail, emailAdminNotice, createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';

// POST /api/admin/tools/broadcast   body: { message, audience: 'owners' | 'all_staff' | 'everyone' }
// Emails (and, where the recipient has an in-app account, notifies) every matching user.
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { message, audience } = await req.json();
    if (!message?.trim()) return sendResponse(false, 'message is required', null, 400);

    const roleFilter: Record<string, any> =
      audience === 'owners' ? { role: 'owner' }
      : audience === 'all_staff' ? { role: { $in: ['owner', 'manager', 'frontdesk', 'technician', 'driver'] } }
      : { role: { $ne: 'super_admin' } }; // 'everyone' (still excludes super admins)

    const recipients = await User.find({ ...roleFilter, isActive: true }).select('_id name email tenantId').lean() as any[];

    await Promise.allSettled(
      // Broadcasts are announcements, not transactional mail — honor the "Disable Marketing Emails" toggle.
      recipients.filter((r) => r.email).map((r) => sendEmail(r.email, 'Announcement from Platform Admin', emailAdminNotice(r.name, message), { category: 'marketing' }))
    );
    await Promise.allSettled(
      recipients.filter((r) => r.tenantId).map((r) =>
        createNotification({
          tenantId: String(r.tenantId),
          recipientUserId: String(r._id),
          type: 'admin_broadcast',
          title: 'Announcement from Platform Admin',
          message,
        })
      )
    );

    const adminId = req.headers.get('x-user-id') || 'unknown';
    if (adminId !== 'unknown') {
      createAuditLog({
        tenantId: adminId,
        userId: adminId,
        action: AUDIT_ACTIONS.NOTICE_SENT,
        entity: 'broadcast',
        details: { audience, recipients: recipients.length, message },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    return sendResponse(true, `Broadcast sent to ${recipients.length} user(s)`, { count: recipients.length });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
