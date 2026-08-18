import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import bcrypt from 'bcryptjs';
import { validatePassword, isPasswordReused } from '@/utils/passwordPolicy';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { getPlatformSettings } from '@/lib/platformSettings';
import { issueSession } from '@/lib/auth/issueSession';

// POST /api/auth/complete-password-reset — unauthenticated by design (same trust
// model as verify-otp), but a bare userId is never enough on its own: the login
// route mints a single-use `resetToken` (hashed + 10-minute expiry) only after a
// *correct* password check, and this endpoint requires that exact token in
// addition to `forcePasswordReset` being set — otherwise anyone who merely learns
// a userId (e.g. a teammate via /api/chat/contacts) could take over the account
// without ever knowing its password. Used for the guided "set a new password"
// step shown to staff logging in with a temporary password for the first time.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, resetToken, newPassword } = await req.json();
    if (!userId || !resetToken || !newPassword) {
      return sendResponse(false, 'A new password is required.', null, 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(false, 'Invalid or expired reset session.', null, 401);
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return sendResponse(false, `Account locked. Try again in ${minutesLeft} minute(s).`, null, 423);
    }

    if (!user.forcePasswordReset) {
      return sendResponse(false, 'This account does not require a password reset.', null, 400);
    }

    if (!user.forceResetTokenHash || !user.forceResetTokenExpiry || user.forceResetTokenExpiry < Date.now()) {
      return sendResponse(false, 'Invalid or expired reset session.', null, 401);
    }

    const incomingTokenHash = crypto.createHash('sha256').update(String(resetToken)).digest('hex');
    const tokenMatches = crypto.timingSafeEqual(
      Buffer.from(incomingTokenHash, 'hex'),
      Buffer.from(user.forceResetTokenHash, 'hex')
    );
    if (!tokenMatches) {
      return sendResponse(false, 'Invalid or expired reset session.', null, 401);
    }

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
    user.forceResetTokenHash = undefined;
    user.forceResetTokenExpiry = undefined;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null as any;
    await user.save();

    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_COMPLETE,
      entity: 'user',
      entityId: user._id.toString(),
      details: { flow: 'forced-first-login' },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return issueSession(user, req, settings.sessionTimeout, settings.preventMultipleSessions);
  } catch (error: any) {
    console.error('Complete Password Reset API Failure:', error.message);
    return sendResponse(false, error.message || 'Failed to reset password.', null, 500);
  }
}
