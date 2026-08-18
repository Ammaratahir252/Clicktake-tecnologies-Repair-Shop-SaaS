import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DirectMessage from '@/models/directMessage.model';
import ChatThread from '@/models/chatThread.model';
import { canonicalPair } from '@/lib/chatThreadKey';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'technician', 'driver'];

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// PATCH /api/chat/direct/read — mark every message `with` sent me as read
export async function PATCH(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const withId = typeof body?.with === 'string' ? body.with : '';
    if (!withId || withId.length !== 24) return sendResponse(false, 'with is required', null, 400);

    await DirectMessage.updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        senderId: new mongoose.Types.ObjectId(withId),
        recipientId: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    // Zero the reader's counter on the denormalized thread summary (see
    // chatThread.model.ts) so /api/chat/contacts reflects this instantly
    // without re-deriving it from the message collection.
    const { userA, userB, callerIsUserA } = canonicalPair(userId, withId);
    try {
      await ChatThread.updateOne(
        { tenantId: new mongoose.Types.ObjectId(tenantId), userA: new mongoose.Types.ObjectId(userA), userB: new mongoose.Types.ObjectId(userB) },
        { $set: callerIsUserA ? { unreadA: 0 } : { unreadB: 0 } }
      );
    } catch (syncErr) {
      console.error('[chat/direct/read] ChatThread sync failed', syncErr);
    }

    return sendResponse(true, 'Marked as read');
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
