import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Lead from '@/models/lead.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, userName, role } = getCtx(req);
    if (!tenantId || !userId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'manager', 'super_admin'].includes(role))
      return sendResponse(false, 'Forbidden', null, 403);

    const lead = await Lead.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!lead) return sendResponse(false, 'Lead not found', null, 404);

    // Prevent double-claiming
    if (lead.claimedBy) {
      return sendResponse(false, 'Lead already claimed', null, 409);
    }

    lead.claimedBy     = new mongoose.Types.ObjectId(userId);
    lead.claimedByName = userName;
    lead.claimedAt     = new Date();
    lead.assignedTo    = new mongoose.Types.ObjectId(userId); // also assign to claimer
    lead.status        = 'contacted'; // auto-progress status
    await lead.save();

    return sendResponse(true, 'Lead claimed successfully', lead);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}