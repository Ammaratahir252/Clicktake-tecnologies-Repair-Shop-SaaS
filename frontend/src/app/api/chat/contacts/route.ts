import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import ChatThread from '@/models/chatThread.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

// Reads the caller's tenant/role from verified request headers on every call —
// must never be statically prerendered at build time (no headers exist then).
export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'technician', 'driver'];

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// GET /api/chat/contacts — every OTHER staff member on this tenant, for
// starting/continuing a direct-message thread. Enriched with each contact's
// most recent message and unread count so the DM list can render an inbox
// (most-recently-active conversation first), same shape as any chat app.
//
// Reads the denormalized ChatThread summary table (kept in sync by POST
// /api/chat/direct and PATCH /api/chat/direct/read) instead of aggregating
// the full DirectMessage history — this endpoint is polled every few seconds
// by every open chat tab, so its cost has to stay flat as message history
// grows, not scan-proportional to it.
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const tid = new mongoose.Types.ObjectId(tenantId);
    const uid = new mongoose.Types.ObjectId(userId);

    const [teammates, threads] = await Promise.all([
      User.find({ tenantId: tid, role: { $in: STAFF_ROLES }, _id: { $ne: uid } })
        .select('name role')
        .lean(),
      ChatThread.find({ tenantId: tid, $or: [{ userA: uid }, { userB: uid }] })
        .select('userA userB lastMessage lastAt unreadA unreadB')
        .lean(),
    ]);

    // Bounded by team size (a handful to a few dozen threads per user), not
    // by message volume — this map build is O(teammates), always cheap.
    const summaryMap = new Map(
      threads.map((t: any) => {
        const callerIsUserA = String(t.userA) === String(uid);
        const otherId = callerIsUserA ? String(t.userB) : String(t.userA);
        return [
          otherId,
          {
            lastMessage: t.lastMessage,
            lastAt: t.lastAt,
            unread: callerIsUserA ? t.unreadA : t.unreadB,
          },
        ];
      })
    );

    const contacts = teammates
      .map((t: any) => {
        const summary = summaryMap.get(String(t._id));
        return {
          _id: String(t._id),
          name: t.name,
          role: t.role,
          lastMessage: summary?.lastMessage ?? null,
          lastAt: summary?.lastAt ?? null,
          unread: summary?.unread ?? 0,
        };
      })
      .sort((a, b) => {
        if (!a.lastAt && !b.lastAt) return a.name.localeCompare(b.name);
        if (!a.lastAt) return 1;
        if (!b.lastAt) return -1;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });

    return sendResponse(true, 'Contacts fetched', contacts);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
