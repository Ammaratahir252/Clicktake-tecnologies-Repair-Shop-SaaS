import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';

/**
 * PATCH: Update user status or details
 * DELETE: Remove a staff member
 */

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectDB();
    const tenantId = req.headers.get('x-tenant-id');
    const { userId } = params;
    const body = await req.json();

    // Ensure the user belongs to the same tenant for security
    const { name, email, role, isActive } = body;

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      { $set: { name, email, role, isActive } }, // never touch tenantId or password here
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return sendResponse(false, 'User not found or unauthorized', null, 404);
    }

    return sendResponse(true, 'User updated successfully', updatedUser);
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectDB();
    const tenantId = req.headers.get('x-tenant-id');
    const { userId } = params;

    const deletedUser = await User.findOneAndDelete({ _id: userId, tenantId });

    if (!deletedUser) {
      return sendResponse(false, 'User not found or unauthorized', null, 404);
    }

    return sendResponse(true, 'User deleted successfully');
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}