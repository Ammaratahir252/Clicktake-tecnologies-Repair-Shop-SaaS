import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Tenant from '@/models/tenant.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain');

    let shop;
    if (subdomain) {
      shop = await Tenant.findOne({ subdomain, isActive: true }).lean();
    } else {
      const { tenantId, role } = getCtx(req);
      if (!tenantId || !['owner', 'super_admin'].includes(role)) {
        return sendResponse(false, 'Provide a subdomain or authenticate as owner', null, 400);
      }
      shop = await Tenant.findById(tenantId).lean();
    }

    if (!shop) return sendResponse(false, 'Shop not found', null, 404);
    return sendResponse(true, 'Shop profile fetched', shop);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json();
    const allowed = ['name', 'tagline', 'description', 'phone', 'address', 'city', 'postcode',
                     'acceptedDevices', 'servicesOffered', 'openingHours', 'logo', 'socialLinks'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const shop = await Tenant.findByIdAndUpdate(
      new mongoose.Types.ObjectId(tenantId),
      { $set: update },
      { new: true }
    );
    if (!shop) return sendResponse(false, 'Shop not found', null, 404);
    return sendResponse(true, 'Shop profile updated', shop);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
