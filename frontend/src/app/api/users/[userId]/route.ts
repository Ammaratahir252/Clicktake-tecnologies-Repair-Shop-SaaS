import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';

// --- NEW IMPORTS FOR RBAC & AUDIT ---
import { permissionMiddleware } from '@/middleware/permissionMiddleware';
import { ACTION_STRINGS } from '@/lib/permissions';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { getManagerPermissions } from '@/lib/managerPermissions';

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
    const requesterRole = req.headers.get('x-role');
    const { userId } = params;
    const body = await req.json();

    // Owner-controlled: a manager can only edit staff accounts if the owner has
    // explicitly enabled it (Owner Settings → Manager Permissions).
    if (requesterRole === 'manager') {
      const perms = await getManagerPermissions(tenantId as string);
      if (!perms.editTeam) {
        return sendResponse(false, 'Your shop owner has not enabled staff account editing for managers', null, 403);
      }
    }

    // Ensure the user belongs to the same tenant for security
    const { name, email, role, isActive } = body;

    // Nobody may be promoted to (or edited while holding) 'owner' via this endpoint —
    // there is exactly one owner per tenant, set at signup.
    const target = await User.findOne({ _id: userId, tenantId }).select('role');
    if (!target) {
      return sendResponse(false, 'User not found or unauthorized', null, 404);
    }
    if (target.role === 'owner' || role === 'owner') {
      return sendResponse(false, 'The shop owner account cannot be edited here', null, 403);
    }

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
      entityId: updatedUser._id.toString(),
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
    const requesterRole = req.headers.get('x-role');
    const { userId } = params;

    if (requesterRole === 'manager') {
      const perms = await getManagerPermissions(tenantId as string);
      if (!perms.editTeam) {
        return sendResponse(false, 'Your shop owner has not enabled staff account editing for managers', null, 403);
      }
    }

    const target = await User.findOne({ _id: userId, tenantId }).select('role');
    if (target?.role === 'owner') {
      return sendResponse(false, 'The shop owner account cannot be removed', null, 403);
    }

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
      entityId: deletedUser._id.toString(),
      details: { deletedEmail: deletedUser.email }
    });

    return sendResponse(true, 'User deleted successfully');
  } catch (error: any) {
    return sendResponse(false, error.message, null, 400);
  }
}