import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Review from '@/models/review.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Customer',
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId } = getCtx(req);
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get('public') === 'true';

    const query: Record<string, unknown> = {};
    if (publicOnly) {
      // Public shop reviews — no tenant filter needed but use subdomain if provided
      const subdomain = searchParams.get('subdomain');
      if (subdomain) {
        const Tenant = (await import('@/models/tenant.model')).default;
        const tenant = await Tenant.findOne({ subdomain, isActive: true });
        if (!tenant) return sendResponse(false, 'Shop not found', null, 404);
        query.tenantId = tenant._id;
      }
      query.isPublic = true;
    } else {
      if (!tenantId || !userId) return sendResponse(false, 'Unauthorized', null, 401);
      query.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 }).lean();
    return sendResponse(true, 'Reviews fetched', reviews);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName } = getCtx(req);
    const body = await req.json();
    const { ticketId, rating, comment, technicianId, shopSubdomain } = body;

    if (!rating || rating < 1 || rating > 5) {
      return sendResponse(false, 'Rating must be between 1 and 5', null, 400);
    }

    let resolvedTenantId = tenantId;

    // Public submission (customer not logged in to a shop)
    if (!resolvedTenantId && shopSubdomain) {
      const Tenant = (await import('@/models/tenant.model')).default;
      const tenant = await Tenant.findOne({ subdomain: shopSubdomain, isActive: true });
      if (!tenant) return sendResponse(false, 'Shop not found', null, 404);
      resolvedTenantId = tenant._id.toString();
    }

    if (!resolvedTenantId) return sendResponse(false, 'Unauthorized', null, 401);

    const review = await Review.create({
      tenantId:     new mongoose.Types.ObjectId(resolvedTenantId),
      ticketId:     ticketId ? new mongoose.Types.ObjectId(ticketId) : undefined,
      technicianId: technicianId ? new mongoose.Types.ObjectId(technicianId) : undefined,
      customerName: userName,
      rating,
      comment,
      isPublic: true,
    });

    return sendResponse(true, 'Review submitted. Thank you!', review, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
