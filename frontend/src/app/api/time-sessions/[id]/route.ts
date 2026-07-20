// src/app/api/time-sessions/[id]/route.ts
// Stop, edit, or delete a single time session.
// Technicians may only touch their own sessions; owner/manager any in the tenant.

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TimeSession, { MAX_SESSION_SECONDS } from '@/models/timeSession.model';
import { sendResponse } from '@/utils/apiResponse';
import { UpdateSessionSchema } from '@/lib/validation/timeSession';

const MANAGE_ALL_ROLES = new Set(['owner', 'manager', 'super_admin']);
const TRACK_ROLES = new Set(['technician', 'owner', 'manager', 'super_admin']);

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

async function findScopedSession(id: string, tenantId: string, userId: string, role: string) {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(tenantId)) return null;
  const query: Record<string, any> = {
    _id: new mongoose.Types.ObjectId(id),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };
  if (!MANAGE_ALL_ROLES.has(role)) {
    query.technicianId = new mongoose.Types.ObjectId(userId);
  }
  return TimeSession.findOne(query);
}

// PATCH /api/time-sessions/:id
//   { stop: true, note? }        → stop the running timer (server computes duration)
//   { durationSeconds, note? }   → edit a completed session
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!TRACK_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSessionSchema.safeParse(body);
    if (!parsed.success) return sendResponse(false, parsed.error.errors[0].message, null, 400);

    const session = await findScopedSession(params.id, tenantId, userId, role);
    if (!session) return sendResponse(false, 'Session not found', null, 404);

    if (parsed.data.stop) {
      if (session.endedAt) return sendResponse(false, 'This session is already stopped', null, 400);
      const endedAt = new Date();
      const rawSeconds = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000);
      // Clamp: a forgotten overnight timer saves at most 24h and never negative.
      session.endedAt = endedAt;
      session.durationSeconds = Math.min(MAX_SESSION_SECONDS, Math.max(1, rawSeconds));
    } else if (parsed.data.durationSeconds !== undefined) {
      if (!session.endedAt) return sendResponse(false, 'Stop the session before editing its duration', null, 400);
      session.durationSeconds = parsed.data.durationSeconds;
    }

    if (parsed.data.note !== undefined) session.note = parsed.data.note;
    await session.save();

    return sendResponse(true, parsed.data.stop ? 'Session saved' : 'Session updated', session);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// DELETE /api/time-sessions/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!TRACK_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);

    const session = await findScopedSession(params.id, tenantId, userId, role);
    if (!session) return sendResponse(false, 'Session not found', null, 404);

    await session.deleteOne();
    return sendResponse(true, 'Session deleted', { id: params.id });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
