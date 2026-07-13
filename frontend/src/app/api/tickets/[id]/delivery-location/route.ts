import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import User from '@/models/user.model';
import { reverseGeocode } from '@/lib/mapbox';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'super_admin'];

/**
 * PATCH /api/tickets/:id/delivery-location
 * Body: { lat, lng }
 *
 * Sets (or updates) exactly where THIS ticket should be delivered, captured
 * live from the customer's (or staff's) device via navigator.geolocation.
 * Works anywhere in the world — UK, USA, Pakistan, etc — since it's just
 * raw coordinates reverse-geocoded through Mapbox for a readable address.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!tenantId || !userId) return sendResponse(false, 'Unauthorized', null, 401);

    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendResponse(false, 'Valid lat/lng required', null, 400);
    }

    const ticket = await Ticket.findOne({ _id: params.id, tenantId });
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);

    // ── Authorization ────────────────────────────────────────────────────
    // Staff can set the delivery point for any ticket in their tenant.
    // A customer may only set it for their own ticket (matched by phone).
    if (!STAFF_ROLES.includes(role)) {
      if (role !== 'customer') return sendResponse(false, 'Forbidden', null, 403);
      const user = await User.findById(userId).lean() as any;
      const customer = await Customer.findById(ticket.customerId).lean() as any;
      if (!user?.phone || !customer?.phone || user.phone !== customer.phone) {
        return sendResponse(false, 'Forbidden: not your ticket', null, 403);
      }
    }

    // Reverse geocode for a human-readable address; non-fatal if it fails
    // (e.g. Mapbox token not configured yet) — coordinates are still saved.
    let address: string | undefined;
    try {
      const geo = await reverseGeocode(lat, lng);
      address = geo.address;
    } catch {
      address = undefined;
    }

    ticket.deliveryLocation = { lat, lng, address, updatedAt: new Date() };
    await ticket.save();

    // Best-effort: keep the customer record's saved location fresh too,
    // so future orders can default to their last known spot.
    try {
      await Customer.findByIdAndUpdate(ticket.customerId, {
        $set: { lat, lng, locationUpdatedAt: new Date() },
      });
    } catch {
      // non-fatal
    }

    return sendResponse(true, 'Delivery location updated', ticket.deliveryLocation);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
