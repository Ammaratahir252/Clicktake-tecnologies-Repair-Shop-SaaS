import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';

function isSuperAdmin(req: NextRequest) {
  return req.headers.get('x-role') === 'super_admin';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const tenant = await Tenant.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: false }
    ).lean();
    if (!tenant) return sendResponse(false, 'Tenant not found', null, 404);
    return sendResponse(true, 'Tenant updated', tenant);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    await Tenant.findByIdAndDelete(params.id);
    return sendResponse(true, 'Tenant deleted', null);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
