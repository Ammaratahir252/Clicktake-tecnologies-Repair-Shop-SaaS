// src/app/api/time-sessions/route.ts
// Technician time tracking — list sessions and start a new one.
// Auth: middleware verifies the JWT and injects x-tenant-id / x-user-id / x-role;
// this route is in the middleware matcher, so those headers cannot be client-forged.

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TimeSession from '@/models/timeSession.model';
import Ticket from '@/models/ticket.model';
import { sendResponse } from '@/utils/apiResponse';
import { StartSessionSchema } from '@/lib/validation/timeSession';

// Technicians log their own time; owner/manager can review the whole shop's.
const VIEW_ALL_ROLES = new Set(['owner', 'manager', 'super_admin']);
const TRACK_ROLES = new Set(['technician', 'owner', 'manager', 'super_admin']);
const READ_ROLES = new Set(['technician', 'owner', 'manager', 'frontdesk', 'super_admin']);

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// GET /api/time-sessions?ticketId=&technicianId=&active=true&from=&to=&limit=
// Technicians always see only their own sessions; owner/manager may see any
// technician's (optionally filtered). `from`/`to` bound startedAt.
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!READ_ROLES.has(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!mongoose.Types.ObjectId.isValid(tenantId)) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const query: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (VIEW_ALL_ROLES.has(role)) {
      const techParam = searchParams.get('technicianId');
      if (techParam && mongoose.Types.ObjectId.isValid(techParam)) {
        query.technicianId = new mongoose.Types.ObjectId(techParam);
      }
    } else {
      query.technicianId = new mongoose.Types.ObjectId(userId);
    }

    const ticketId = searchParams.get('ticketId');
    if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
      query.ticketId = new mongoose.Types.ObjectId(ticketId);
    }
    if (searchParams.get('active') === 'true') query.endedAt = null;

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      query.startedAt = {};
      if (from && !isNaN(Date.parse(from))) query.startedAt.$gte = new Date(from);
      if (to && !isNaN(Date.parse(to))) query.startedAt.$lte = new Date(to);
    }

    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)));
    const sessions = await TimeSession.find(query)
      .sort({ startedAt: -1 })
      .limit(limit)
      .populate('ticketId', 'ticketNumber deviceBrand deviceModel')
      .lean();

    return sendResponse(true, 'Time sessions retrieved', sessions);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// POST /api/time-sessions — start the timer on a ticket. Creates an "active"
// session (endedAt null). 409 if this user already has one running, so an
// accidental double-start can't create overlapping sessions; the response
// includes the running session so the client can resume it.
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!TRACK_ROLES.has(role)) {
      return sendResponse(false, 'Forbidden: only shop staff can track time', null, 403);
    }
    if (!mongoose.Types.ObjectId.isValid(tenantId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendResponse(false, 'Unauthorized', null, 401);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = StartSessionSchema.safeParse(body);
    if (!parsed.success) return sendResponse(false, parsed.error.errors[0].message, null, 400);

    // Ticket must belong to this tenant.
    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(parsed.data.ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).select('_id ticketNumber').lean();
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);

    const running = await TimeSession.findOne({
      technicianId: new mongoose.Types.ObjectId(userId),
      endedAt: null,
    }).lean();
    if (running) {
      return sendResponse(false, 'You already have a running timer — stop it first.', running, 409);
    }

    const session = await TimeSession.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ticketId: new mongoose.Types.ObjectId(parsed.data.ticketId),
      technicianId: new mongoose.Types.ObjectId(userId),
      technicianName: userName,
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: 0,
      note: parsed.data.note,
    });

    return sendResponse(true, 'Timer started', session, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
