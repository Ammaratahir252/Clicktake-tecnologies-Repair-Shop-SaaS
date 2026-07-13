import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/notification.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'notifications');
}

// GET /api/admin/notifications — platform-wide notification feed (all tenants, all users).
export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 300);

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: 'tenantId', model: 'Tenant', select: 'name subdomain' })
      .populate({ path: 'recipientUserId', model: 'User', select: 'name email role' })
      .lean() as any[];

    const enriched = notifications.map((n) => ({
      ...n,
      tenantName:     n.tenantId && typeof n.tenantId === 'object' ? n.tenantId.name : undefined,
      tenantId:       n.tenantId && typeof n.tenantId === 'object' ? String(n.tenantId._id) : n.tenantId,
      recipientName:  n.recipientUserId && typeof n.recipientUserId === 'object' ? n.recipientUserId.name : undefined,
      recipientRole:  n.recipientUserId && typeof n.recipientUserId === 'object' ? n.recipientUserId.role : undefined,
      recipientUserId: n.recipientUserId && typeof n.recipientUserId === 'object' ? String(n.recipientUserId._id) : n.recipientUserId,
    }));

    return sendResponse(true, 'Notifications fetched', enriched);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
