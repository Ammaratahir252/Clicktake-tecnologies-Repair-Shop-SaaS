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
    const {
      subdomain, name, phone, email, device, issue,
      source = 'website',
      deliveryType = 'drop-off',  // 'drop-off' | 'doorstep'
      deliveryAddress,
      preferredTime,
    } = body;

    if (!subdomain || !name || !device || !issue) {
      return sendResponse(false, 'subdomain, name, device, and issue are required', null, 400);
    }

    const tenant = await Tenant.findOne({ subdomain, isActive: true });
    if (!tenant) return sendResponse(false, 'Shop not found', null, 404);

    const count = await Lead.countDocuments({ tenantId: tenant._id });
    const leadNumber = `L-${String(count + 1).padStart(3, '0')}`;

    const notes = [];
    if (deliveryType === 'doorstep') {
      notes.push({
        content: `Doorstep delivery requested. Address: ${deliveryAddress ?? 'Not provided'}. Preferred time: ${preferredTime ?? 'Not specified'}.`,
        authorId: 'system',
        authorName: 'System',
        createdAt: new Date(),
      });
    }

    const lead = await Lead.create({
      tenantId: tenant._id,
      leadNumber,
      name, phone, email,
      device,
      issue: deliveryType === 'doorstep'
        ? `${issue} [Doorstep pickup requested]`
        : issue,
      source,
      status: 'new',
      notes,
    });

    return sendResponse(true, 'Repair request submitted successfully. The shop will contact you shortly.', {
      leadNumber: lead.leadNumber,
      shopName: tenant.name,
      deliveryType,
    }, 201);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
