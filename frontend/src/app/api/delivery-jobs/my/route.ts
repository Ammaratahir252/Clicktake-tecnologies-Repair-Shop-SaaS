import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Ticket from '@/models/ticket.model';
import mongoose from 'mongoose';

// Reads the caller's tenant/role from verified request headers on every call —
// must never be statically prerendered at build time (no headers exist then).
export const dynamic = 'force-dynamic';

// This route is protected by middleware.ts's default-deny API auth model —
// the headers below are the verified values middleware sets from the caller's
// JWT after stripping whatever the client sent, never raw client headers.
// See the 2026-07-20 audit (Critical #2) for why that distinction matters here.
function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

/**
 * GET /api/delivery-jobs/my — the tickets currently assigned to the calling
 * driver (technicianId === the driver's own userId), formatted as delivery
 * jobs. Narrower than GET /api/tickets (which returns every ready/delivered
 * ticket tenant-wide to a driver, not just their own assignments) — surfaced
 * on the driver dashboard as "My Deliveries".
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!tenantId || !userId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['driver', 'super_admin'].includes(role))
      return sendResponse(false, 'Forbidden', null, 403);

    const tickets = await Ticket.find({
      tenantId:     new mongoose.Types.ObjectId(tenantId),
      technicianId: new mongoose.Types.ObjectId(userId),
      status:       { $in: ['ready', 'delivered'] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const jobs = tickets.map((t: any) => ({
      _id:          t._id,
      jobType:      'delivery',
      customerName: t.customerName ?? 'Customer',
      status:       t.status === 'ready' ? 'assigned' : 'delivered',
      address:      { street: t.customerAddress ?? t.address ?? 'Address not set' },
      ticketNumber: t.ticketNumber,
      device:       t.device,
      updatedAt:    t.updatedAt,
    }));

    return sendResponse(true, 'Jobs fetched', jobs);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}