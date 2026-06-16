import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Tenant from '@/models/tenant.model';

// Public endpoint — no auth required
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const device = searchParams.get('device');

    const query: Record<string, unknown> = { isActive: true };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (device) query.acceptedDevices = { $in: [new RegExp(device, 'i')] };

    const shops = await Tenant.find(query)
      .select('name subdomain tagline description logo city postcode phone acceptedDevices servicesOffered openingHours')
      .sort({ name: 1 })
      .lean();

    return sendResponse(true, 'Shops fetched', shops);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
