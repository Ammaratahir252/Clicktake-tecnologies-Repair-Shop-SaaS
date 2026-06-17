import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
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
    const user = await User.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: false }
    )
      .select('-password -resetPasswordToken -resetPasswordExpiry')
      .lean();
    if (!user) return sendResponse(false, 'User not found', null, 404);
    return sendResponse(true, 'User updated', user);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
