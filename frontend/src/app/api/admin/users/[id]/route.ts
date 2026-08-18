import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailAccountDeleted } from '@/lib/notifications';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'users');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json();
    const requesterId = req.headers.get('x-user-id') ?? '';
    const isRealSuperAdmin = req.headers.get('x-role') === 'super_admin';

    if (params.id === requesterId) {
      return sendResponse(false, 'You cannot modify your own account from this panel', null, 403);
    }

    // Granting/editing permissions or the admin/super_admin roles is a privilege-escalation
    // risk — only a real super_admin may do it, even if a scoped admin has 'users' access.
    const touchesPrivilege = 'permissions' in body || body.role === 'admin' || body.role === 'super_admin';
    if (touchesPrivilege && !isRealSuperAdmin) {
      return sendResponse(false, 'Only a super admin can change roles or permissions', null, 403);
    }

    // A scoped admin (role: 'admin' granted the 'users' section) must never be able to
    // deactivate/edit another admin or a super_admin — only a real super_admin can touch
    // privileged accounts. Scoped admins may only manage ordinary tenant users.
    if (!isRealSuperAdmin) {
      const target = await User.findById(params.id).select('role').lean() as any;
      if (target && (target.role === 'admin' || target.role === 'super_admin')) {
        return sendResponse(false, 'Only a super admin can modify another admin account', null, 403);
      }
    }

    const update: Record<string, any> = { ...body };
    if ('permissions' in body) update.$inc = { tokenVersion: 1 }; // force re-login so the new permission set takes effect immediately

    const { $inc, ...rest } = update;
    const user = await User.findByIdAndUpdate(
      params.id,
      $inc ? { $set: rest, $inc } : { $set: rest },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const requesterId = req.headers.get('x-user-id') ?? '';
    const isRealSuperAdmin = req.headers.get('x-role') === 'super_admin';

    if (params.id === requesterId) {
      return sendResponse(false, 'You cannot delete your own account from this panel', null, 403);
    }

    if (!isRealSuperAdmin) {
      const target = await User.findById(params.id).select('role').lean() as any;
      if (target && (target.role === 'admin' || target.role === 'super_admin')) {
        return sendResponse(false, 'Only a super admin can delete another admin account', null, 403);
      }
    }

    const user = await User.findByIdAndDelete(params.id).lean() as any;
    if (!user) return sendResponse(false, 'User not found', null, 404);

    const superAdminId = req.headers.get('x-user-id') || 'unknown';
    if (superAdminId !== 'unknown') {
      createAuditLog({
        tenantId: user.tenantId ? user.tenantId.toString() : params.id,
        userId: superAdminId,
        action: AUDIT_ACTIONS.USER_DELETED,
        entity: 'user',
        entityId: params.id,
        details: { deletedEmail: user.email, deletedRole: user.role },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    if (user.email) {
      sendEmail(
        user.email,
        'Your Account Has Been Closed',
        emailAccountDeleted(user.name || 'there', 'staff account')
      ).catch(() => {});
    }

    return sendResponse(true, 'User permanently deleted');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
