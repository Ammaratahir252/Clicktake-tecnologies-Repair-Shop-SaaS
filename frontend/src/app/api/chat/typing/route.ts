import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import TypingStatus from '@/models/typingStatus.model';
import { sendResponse } from '@/utils/apiResponse';
import mongoose from 'mongoose';

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'technician', 'driver'];
// A ping older than this is treated as "stopped typing" — well under the TTL
// index's cleanup window, so this is always the real source of truth.
const RECENT_MS = 6000;

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// GET /api/chat/typing?scope=team|<myUserId>&peer=<otherUserId> — who (besides
// me) is currently typing. `scope` selects signals aimed at me (or the team
// channel); for a DM, `peer` additionally narrows to the ONE other person this
// conversation is actually with — without it, an unrelated third staffer who
// also happens to be typing to me right now (in a totally different thread)
// would incorrectly light up the indicator on whatever DM I'm looking at.
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') ?? '';
    if (!scope) return sendResponse(false, 'scope is required', null, 400);
    // `scope` means "signals aimed at me" — the only legitimate values are the
    // team channel or the caller's own userId. Without this check, a caller
    // could pass ANY other staffer's id as `scope` and read who is typing to
    // THEM instead, leaking DM activity between two other people.
    if (scope !== 'team' && scope !== userId) return sendResponse(false, 'Forbidden', null, 403);
    const peer = searchParams.get('peer') ?? '';

    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      scope,
      userId: { $ne: new mongoose.Types.ObjectId(userId) },
      updatedAt: { $gte: new Date(Date.now() - RECENT_MS) },
    };

    // Team channel has no single "peer" — everyone typing to the shared
    // channel is relevant, so `peer` (if sent at all) is ignored there.
    if (scope !== 'team' && peer.length === 24) {
      query.userId = new mongoose.Types.ObjectId(peer);
    }

    const typers = await TypingStatus.find(query)
      .select('userName')
      .lean();

    return sendResponse(true, 'Typing status fetched', typers.map((t: any) => t.userName));
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// POST /api/chat/typing — { scope: 'team' | recipientUserId } — "I am typing, right now"
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const scope = typeof body?.scope === 'string' ? body.scope : '';
    if (!scope) return sendResponse(false, 'scope is required', null, 400);

    // For a DM, `scope` is the OTHER user's id — verify they're really a
    // staff member of this same tenant, same guarantee as sending a message.
    if (scope !== 'team') {
      if (scope.length !== 24) return sendResponse(false, 'Invalid scope', null, 400);
      const target = await User.findOne({ _id: scope, tenantId, role: { $in: STAFF_ROLES } }).select('_id').lean();
      if (!target) return sendResponse(false, 'Invalid scope', null, 404);
    }

    await TypingStatus.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId), userId: new mongoose.Types.ObjectId(userId), scope },
      { $set: { userName, updatedAt: new Date() } },
      { upsert: true }
    );

    return sendResponse(true, 'Typing status updated');
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
