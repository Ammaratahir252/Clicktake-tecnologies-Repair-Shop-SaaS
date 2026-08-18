import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import DirectMessage from '@/models/directMessage.model';
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

// GET /api/chat/direct/seen?with=<userId> — the most recent moment `with` read
// one of MY messages to them. The UI uses this to show "Seen" under my last
// message once its createdAt <= this timestamp (same convention as Instagram:
// only the single most recent read point is shown, not per-message ticks).
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const withId = new URL(req.url).searchParams.get('with') ?? '';
    if (withId.length !== 24) return sendResponse(false, 'with is required', null, 400);

    const latest = await DirectMessage.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      senderId: new mongoose.Types.ObjectId(userId),
      recipientId: new mongoose.Types.ObjectId(withId),
      readAt: { $ne: null },
    })
      .sort({ readAt: -1 })
      .select('readAt')
      .lean();

    return sendResponse(true, 'Seen status fetched', { readAt: (latest as any)?.readAt ?? null });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
