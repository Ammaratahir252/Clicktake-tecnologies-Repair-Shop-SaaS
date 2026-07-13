import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Ticket from '@/models/ticket.model';
import User from '@/models/user.model';
import { getDrivingRoute, haversineMeters } from '@/lib/mapbox';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// Driver is considered "arrived" once within this radius of the drop-off point.
const ARRIVAL_RADIUS_METERS = 100;

/**
 * GET /api/driver/route-info?ticketId=...
 *
 * Given the currently-assigned driver's live location and the ticket's
 * delivery location, returns:
 *   - straight-line + driving distance/ETA
 *   - route geometry (for drawing the line on the map)
 *   - whether the driver has arrived (geofence check)
 *
 * Works anywhere in the world — no dependency on country-specific address
 * formats, since everything is done off raw lat/lng.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!userId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['driver', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) return sendResponse(false, 'ticketId is required', null, 400);

    const ticket = await Ticket.findOne({ _id: ticketId, tenantId }).lean() as any;
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);

    // Only the assigned driver (or super_admin) may pull route info for a ticket.
    if (role === 'driver' && String(ticket.technicianId) !== String(userId)) {
      return sendResponse(false, 'Forbidden: not assigned to this ticket', null, 403);
    }

    const driver = await User.findById(role === 'driver' ? userId : ticket.technicianId)
      .select('currentLocation')
      .lean() as any;

    const driverLoc = driver?.currentLocation;
    const dest = ticket.deliveryLocation;

    if (!driverLoc?.lat || !driverLoc?.lng) {
      return sendResponse(false, 'Driver location not available yet — enable GPS and try again', null, 400);
    }
    if (!dest?.lat || !dest?.lng) {
      return sendResponse(false, 'Delivery location not set for this ticket yet', null, 400);
    }

    const straightLineMeters = haversineMeters(driverLoc.lat, driverLoc.lng, dest.lat, dest.lng);
    const arrived = straightLineMeters <= ARRIVAL_RADIUS_METERS;

    let route = null;
    try {
      route = await getDrivingRoute(driverLoc.lat, driverLoc.lng, dest.lat, dest.lng);
    } catch {
      // Mapbox token missing/failed — fall back to straight-line only, still usable.
    }

    return sendResponse(true, 'Route info fetched', {
      driverLocation: driverLoc,
      destination: dest,
      arrived,
      arrivalRadiusMeters: ARRIVAL_RADIUS_METERS,
      straightLineMeters: Math.round(straightLineMeters),
      distanceMeters: route?.distanceMeters ?? Math.round(straightLineMeters),
      durationSeconds: route?.durationSeconds ?? null,
      geometry: route?.geometry ?? null,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
