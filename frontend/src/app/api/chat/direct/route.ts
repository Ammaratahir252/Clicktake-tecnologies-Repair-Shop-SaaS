import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
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
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

/** Confirms `otherId` is a real staff member of the SAME tenant as the caller.
 * This is the one check that makes cross-tenant DM injection impossible: even
 * if a client supplies another shop's user id, this returns null and the
 * caller 404s — the DM thread can never be established with someone outside
 * the caller's own tenant. */
async function assertSameTenantStaff(otherId: string, tenantId: string) {
  if (!otherId || otherId.length !== 24) return null;
  return User.findOne({ _id: otherId, tenantId, role: { $in: STAFF_ROLES } }).select('name role').lean();
}

// GET /api/chat/direct?with=<userId> — thread between me and `with`, scoped to
// my own tenant. Supports the same before/after pagination shape as team chat.
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const withId = searchParams.get('with') ?? '';
    const before = searchParams.get('before');
    const after  = searchParams.get('after');
    const limit  = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);

    const other = await assertSameTenantStaff(withId, tenantId);
    if (!other) return sendResponse(false, 'Contact not found', null, 404);

    const tid = new mongoose.Types.ObjectId(tenantId);
    const uid = new mongoose.Types.ObjectId(userId);
    const oid = new mongoose.Types.ObjectId(withId);

    // Tenant scope is always applied FIRST — the $or below only ever selects
    // which direction of a thread that's already guaranteed to be inside this
    // tenant, it never widens the result beyond it.
    const query: Record<string, unknown> = {
      tenantId: tid,
      $or: [
        { senderId: uid, recipientId: oid },
        { senderId: oid, recipientId: uid },
      ],
    };

    if (after) {
      const afterDate = new Date(after);
      // Same fail-closed rule as the team channel: an unparseable `after`
      // must return nothing, never silently fall through to this thread's
      // oldest messages mislabeled as "new since X".
      if (isNaN(afterDate.getTime())) return sendResponse(true, 'Messages fetched', []);
      query.createdAt = { $gt: afterDate };
      const messages = await DirectMessage.find(query).sort({ createdAt: 1 }).limit(200).lean();
      return sendResponse(true, 'Messages fetched', messages);
    }

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }

    const messages = await DirectMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    messages.reverse();

    return sendResponse(true, 'Messages fetched', messages);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// POST /api/chat/direct — send a DM to another staff member of your own tenant
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const recipientId = typeof body?.recipientId === 'string' ? body.recipientId : '';
    const text = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!text) return sendResponse(false, 'Message cannot be empty', null, 400);
    if (text.length > 4000) return sendResponse(false, 'Message is too long (max 4000 characters)', null, 400);
    if (recipientId === userId) return sendResponse(false, "You can't message yourself", null, 400);

    const recipient = await assertSameTenantStaff(recipientId, tenantId);
    if (!recipient) return sendResponse(false, 'Recipient not found', null, 404);

    const directMessage = await DirectMessage.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: userName,
      senderRole: role,
      recipientId: new mongoose.Types.ObjectId(recipientId),
      message: text,
    });

    // Keep the denormalized thread summary (used by /api/chat/contacts) in
    // sync in-place — a cheap upsert here is what keeps the contacts list
    // O(1) per thread instead of re-scanning the whole message history on
    // every read. Awaited (not fire-and-forget): in most serverless/Cloud
    // Functions execution models, work kicked off after the response is sent
    // is not guaranteed to finish — the runtime can suspend or recycle the
    // instance first. Failure here is swallowed rather than failing the
    // request, since the message itself (the source of truth) is already
    // safely persisted above; worst case the contacts sidebar for this pair
    // is stale until the next successful send/read.
    const { userA, userB, callerIsUserA } = canonicalPair(userId, recipientId);
    try {
      await ChatThread.findOneAndUpdate(
        { tenantId: new mongoose.Types.ObjectId(tenantId), userA: new mongoose.Types.ObjectId(userA), userB: new mongoose.Types.ObjectId(userB) },
        {
          $set: { lastMessage: text, lastAt: directMessage.createdAt, lastSenderId: new mongoose.Types.ObjectId(userId) },
          $inc: callerIsUserA ? { unreadB: 1 } : { unreadA: 1 },
        },
        { upsert: true }
      );
    } catch (syncErr) {
      console.error('[chat/direct] ChatThread sync failed', syncErr);
    }

    return sendResponse(true, 'Message sent', directMessage, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
