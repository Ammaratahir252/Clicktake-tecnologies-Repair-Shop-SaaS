import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import User from '@/models/user.model';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'technician', 'driver', 'super_admin'];

/**
 * GET /api/tickets/:id/driver-location
 *
 * Lets a customer track their own delivery live on a map — returns the
 * assigned driver's last known GPS position plus the ticket's delivery
 * destination. Works worldwide since it's raw lat/lng, no country logic.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!tenantId || !userId) return sendResponse(false, 'Unauthorized', null, 401);

    const ticket = await Ticket.findOne({ _id: params.id, tenantId }).lean() as any;
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);

    // ── Authorization ────────────────────────────────────────────────────
    if (!STAFF_ROLES.includes(role)) {
      if (role !== 'customer') return sendResponse(false, 'Forbidden', null, 403);
      const user = await User.findById(userId).lean() as any;
      const customer = await Customer.findById(ticket.customerId).lean() as any;
      if (!user?.phone || !customer?.phone || user.phone !== customer.phone) {
        return sendResponse(false, 'Forbidden: not your ticket', null, 403);
      }
    }

    let driverLocation = null;
    if (ticket.technicianId) {
      const driver = await User.findById(ticket.technicianId).select('currentLocation name').lean() as any;
      driverLocation = driver?.currentLocation
        ? { ...driver.currentLocation, driverName: driver.name }
        : null;
    }

    return sendResponse(true, 'Driver location fetched', {
      driverLocation,
      destination: ticket.deliveryLocation ?? null,
      status: ticket.status,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
