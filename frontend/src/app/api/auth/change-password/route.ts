import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '@/models/user.model';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import { validatePassword, isPasswordReused } from '@/utils/passwordPolicy';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { getPlatformSettings } from '@/lib/platformSettings';

// POST /api/auth/change-password — for an already-logged-in user changing their own
// password from Settings (different from the unauthenticated forgot/reset-password flow).
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') ?? '';
    if (!userId) return sendResponse(false, 'Unauthorized', null, 401);

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return sendResponse(false, 'Current password and new password are required', null, 400);
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return sendResponse(false, 'User not found', null, 404);

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return sendResponse(false, 'Current password is incorrect', null, 400);

    const settings = await getPlatformSettings();
    const pwdValidation = validatePassword(newPassword, settings.passwordMinLength, {
      requireUppercase: settings.passwordRequireUppercase,
      requireNumber: settings.passwordRequireNumber,
      requireSymbol: settings.passwordRequireSymbol,
    });
    if (!pwdValidation.valid) {
      return sendResponse(false, pwdValidation.message, null, 400);
    }

    if (settings.passwordHistoryCount > 0) {
      const history = (user.passwordHistory || []).slice(0, settings.passwordHistoryCount);
      if (await isPasswordReused(newPassword, user.password, history)) {
        return sendResponse(false, `You can't reuse one of your last ${settings.passwordHistoryCount} passwords.`, null, 400);
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    user.passwordHistory = [user.password, ...(user.passwordHistory || [])].slice(0, Math.max(settings.passwordHistoryCount, 1));
    user.password = newHash;
    user.passwordChangedAt = new Date();
    user.forcePasswordReset = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidates every OTHER session
    await user.save();

    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
      entity: 'user',
      entityId: user._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Re-issue a fresh token for THIS session (same shape as login) so the user who just
    // changed their own password isn't immediately kicked out by the tokenVersion bump above.
    const timeoutMinutes = Number.isFinite(settings.sessionTimeout) && settings.sessionTimeout > 0 ? settings.sessionTimeout : 60;
    const expiresInSeconds = Math.round(timeoutMinutes * 60);
    const token = jwt.sign(
      {
        userId: user._id,
        tenantId: user.tenantId,
        role: user.role,
        name: user.name,
        tokenVersion: user.tokenVersion,
        permissions: user.role === 'admin' ? (user as any).permissions || [] : undefined,
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: expiresInSeconds }
    );

    const response = sendResponse(true, 'Password changed successfully', { token });
    response.cookies.set('token', token, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresInSeconds,
      path: '/',
    });
    return response;
  } catch (error: any) {
    return sendResponse(false, error.message || 'Server error', null, 500);
  }
}
