import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Lead from '@/models/lead.model';
import Tenant from '@/models/tenant.model';
import mongoose from 'mongoose';

// Public endpoint — customer submits a repair request to a specific shop
export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const body = await req.json();
    const { subdomain, name, phone, email, device, issue, source = 'website' } = body;

    if (!subdomain || !name || !phone || !device || !issue) {
      return sendResponse(false, 'subdomain, name, phone, device, issue are required', null, 400);
    }

    const tenant = await Tenant.findOne({ subdomain, isActive: true });
    if (!tenant) return sendResponse(false, 'Shop not found', null, 404);

    const count = await Lead.countDocuments({ tenantId: tenant._id });
    const leadNumber = `L-${String(count + 1).padStart(3, '0')}`;

    const lead = await Lead.create({
      tenantId: tenant._id,
      leadNumber,
      name, phone, email, device, issue, source,
      status: 'new',
    });

    return sendResponse(true, 'Repair request submitted successfully. The shop will contact you shortly.', {
      leadNumber: lead.leadNumber,
      shopName: tenant.name,
    }, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
