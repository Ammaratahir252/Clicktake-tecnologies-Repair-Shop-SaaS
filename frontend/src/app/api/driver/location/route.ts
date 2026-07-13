import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import User from '@/models/user.model';

function getCtx(req: NextRequest) {
  return {
    userId: req.headers.get('x-user-id') ?? '',
    role:   req.headers.get('x-role')    ?? '',
  };
}

/**
 * POST /api/driver/location
 * Driver's browser calls this periodically (throttled — e.g. every 8-10s via
 * navigator.geolocation.watchPosition) to push its live GPS position.
 * Body: { lat, lng, heading?, speed? }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { userId, role } = getCtx(req);
    if (!userId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['driver', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return sendResponse(false, 'Valid lat/lng required', null, 400);
    }

    const currentLocation: Record<string, unknown> = { lat, lng, updatedAt: new Date() };
    if (Number.isFinite(Number(body.heading))) currentLocation.heading = Number(body.heading);
    if (Number.isFinite(Number(body.speed))) currentLocation.speed = Number(body.speed);

    await User.findByIdAndUpdate(userId, { $set: { currentLocation } });

    return sendResponse(true, 'Location updated', currentLocation);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

/**
 * GET /api/driver/location
 * Returns the driver's own last known location.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { userId, role } = getCtx(req);
    if (!userId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['driver', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const user = await User.findById(userId).select('currentLocation').lean() as any;
    return sendResponse(true, 'Location fetched', user?.currentLocation ?? null);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
