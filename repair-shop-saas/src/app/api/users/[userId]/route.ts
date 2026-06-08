import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';

// --- NEW IMPORTS FOR RBAC & AUDIT ---
import { permissionMiddleware } from '@/middleware/permissionMiddleware';
import { ACTION_STRINGS } from '@/lib/permissions';
import { createAuditLog, AUDIT_ACTIONS } from '@/services/auditLog.service';

/**
 * PATCH: Update user status or details
 * DELETE: Remove a staff member
 */

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectDB();

    /**
     * RBAC CHECK: Only users with 'settings:userMgmt' permission can update users.
     */
    const permissionError = await permissionMiddleware(ACTION_STRINGS.SETTINGS_USER_MGMT)(req as any);
    if (permissionError) return permissionError;

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

    /**
     * AUDIT LOG: Record user update event
     */
    createAuditLog({
      tenantId: tenantId as string,
      userId: req.headers.get('x-user-id') || 'system',
      action: AUDIT_ACTIONS.USER_PROFILE_UPDATED,
      entity: 'user',
      entityId: updatedUser._id,
      details: { updatedFields: Object.keys(body), isActive: isActive }
    });

    return sendResponse(true, 'User updated successfully', updatedUser);
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await connectDB();

    /**
     * RBAC CHECK: Only authorized roles can delete users.
     */
    const permissionError = await permissionMiddleware(ACTION_STRINGS.SETTINGS_USER_MGMT)(req as any);
    if (permissionError) return permissionError;

    const tenantId = req.headers.get('x-tenant-id');
    const { userId } = params;

    const deletedUser = await User.findOneAndDelete({ _id: userId, tenantId });

    if (!deletedUser) {
      return sendResponse(false, 'User not found or unauthorized', null, 404);
    }

    /**
     * AUDIT LOG: Record user deletion event
     */
    createAuditLog({
      tenantId: tenantId as string,
      userId: req.headers.get('x-user-id') || 'system',
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      entity: 'user',
      entityId: deletedUser._id,
      details: { deletedEmail: deletedUser.email }
    });

    return sendResponse(true, 'User deleted successfully');
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}