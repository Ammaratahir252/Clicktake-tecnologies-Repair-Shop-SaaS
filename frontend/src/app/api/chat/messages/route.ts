import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatMessage from '@/models/chatMessage.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

// Internal team chat is a shop-staff feature only — never customers, never
// platform-tier accounts (super_admin/admin have no tenant of their own, and
// this channel is scoped to exactly one tenant's team).
const STAFF_ROLES = new Set(['owner', 'manager', 'frontdesk', 'technician', 'driver']);

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// GET /api/chat/messages
//   no params            → most recent `limit` messages, chronological order
//   ?before=<ISO date>   → older messages than this (scroll-up pagination)
//   ?after=<ISO date>    → messages newer than this (polling for new arrivals)
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!STAFF_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const before = searchParams.get('before');
    const after  = searchParams.get('after');
    const limit  = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);

    // tenantId ALWAYS comes from the verified header, never from a query param
    // or the request body — this is the one filter that must never be
    // overridable by the client, since it's the entire tenant-isolation guarantee.
    const query: Record<string, unknown> = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (after) {
      const afterDate = new Date(after);
      // An unparseable `after` must never silently fall through to an
      // unfiltered query — that would return the channel's OLDEST messages
      // mislabeled as "new since X" instead of nothing. Fail closed.
      if (isNaN(afterDate.getTime())) return sendResponse(true, 'Messages fetched', []);
      query.createdAt = { $gt: afterDate };
      const messages = await ChatMessage.find(query).sort({ createdAt: 1 }).limit(200).lean();
      return sendResponse(true, 'Messages fetched', messages);
    }

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }

    const messages = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    messages.reverse(); // chronological (oldest first) for straightforward rendering

    return sendResponse(true, 'Messages fetched', messages);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// POST /api/chat/messages — send a message to your own tenant's team channel
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!STAFF_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const text = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!text) return sendResponse(false, 'Message cannot be empty', null, 400);
    if (text.length > 4000) return sendResponse(false, 'Message is too long (max 4000 characters)', null, 400);

    // senderId/senderName/senderRole all come from the verified JWT headers —
    // never trust a client-supplied sender identity, or any staff member could
    // post messages impersonating another teammate (or the owner).
    const chatMessage = await ChatMessage.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: userName,
      senderRole: role,
      message: text,
    });

    return sendResponse(true, 'Message sent', chatMessage, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
