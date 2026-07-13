import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Tenant from '@/models/tenant.model';

/**
 * GET /api/shops
 * Public endpoint — no auth required.
 *
 * Two modes:
 *  1. Nearby search (GPS-driven, works in any country):
 *       /api/shops?lat=51.5074&lng=-0.1278&radius=50
 *     Returns shops sorted by real distance (km) from the device's location.
 *
 *  2. Legacy text search (kept for backwards compatibility):
 *       /api/shops?city=London&device=iPhone
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const device = searchParams.get('device');
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radiusKm = parseFloat(searchParams.get('radius') ?? '50'); // default 50km

    const hasValidCoords =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    const deviceFilter: Record<string, unknown> = {};
    if (device) deviceFilter.acceptedDevices = { $in: [new RegExp(device, 'i')] };

    // ── Mode 1: GPS-based nearby search ────────────────────────────────────
    if (hasValidCoords) {
      const shops = await Tenant.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: radiusKm * 1000,
            spherical: true,
            query: { isActive: true, ...deviceFilter },
          },
        },
        {
          $project: {
            name: 1, subdomain: 1, tagline: 1, description: 1, logo: 1,
            city: 1, postcode: 1, country: 1, phone: 1,
            acceptedDevices: 1, servicesOffered: 1, openingHours: 1,
            location: 1,
            distanceMeters: 1,
            distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 50 },
      ]);

      return sendResponse(true, `Found ${shops.length} shop(s) nearby`, shops);
    }

    // ── Mode 2: legacy text search (no GPS provided / permission denied) ──
    const query: Record<string, unknown> = { isActive: true, ...deviceFilter };
    if (city) query.city = { $regex: city, $options: 'i' };

    const shops = await Tenant.find(query)
      .select('name subdomain tagline description logo city postcode country phone acceptedDevices servicesOffered openingHours location')
      .sort({ name: 1 })
      .lean();

    return sendResponse(true, 'Shops fetched', shops);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
