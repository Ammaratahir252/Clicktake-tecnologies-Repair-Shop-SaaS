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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'manager', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const body = await req.json();
    const allowed = ['status', 'assignedTo', 'convertedTicketId'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(params.id), tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: update },
      { new: true }
    );

    if (!lead) return sendResponse(false, 'Lead not found', null, 404);
    return sendResponse(true, 'Lead updated', lead);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);
    if (!tenantId) return sendResponse(false, 'Unauthorized', null, 401);
    if (!['owner', 'super_admin'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    await Lead.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(params.id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });
    return sendResponse(true, 'Lead deleted', null);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
