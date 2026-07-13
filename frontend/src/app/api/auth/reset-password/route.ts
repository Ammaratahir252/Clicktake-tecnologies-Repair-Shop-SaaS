import { NextRequest } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../../../../models/user.model';
import connectDB from '../../../../lib/db';
import { sendResponse } from '../../../../utils/apiResponse';
import { validatePassword } from '../../../../utils/passwordPolicy';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';
import { getPlatformSettings } from '@/lib/platformSettings';
import { isPasswordReused } from '@/utils/passwordPolicy';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    const settings = await getPlatformSettings();
    const pwdValidation = validatePassword(newPassword, settings.passwordMinLength, {
      requireUppercase: settings.passwordRequireUppercase,
      requireNumber: settings.passwordRequireNumber,
      requireSymbol: settings.passwordRequireSymbol,
    });
    if (!pwdValidation.valid) {
      return sendResponse(false, pwdValidation.message, null, 400);
    }

    await connectDB();

    // 1. Hash the incoming token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return sendResponse(false, "Token is invalid or has expired", null, 400);
    }

    if (settings.passwordHistoryCount > 0) {
      const history = (user.passwordHistory || []).slice(0, settings.passwordHistoryCount);
      if (await isPasswordReused(newPassword, user.password, history)) {
        return sendResponse(false, `You can't reuse one of your last ${settings.passwordHistoryCount} passwords.`, null, 400);
      }
    }

    // 2. Hash new password, update history, and clear reset fields
    const newHash = await bcrypt.hash(newPassword, 12);
    user.passwordHistory = [user.password, ...(user.passwordHistory || [])].slice(0, Math.max(settings.passwordHistoryCount, 1));
    user.password = newHash;
    user.passwordChangedAt = new Date();
    user.forcePasswordReset = false;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate existing sessions
    await user.save();

    // 3. Log the completion
    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : undefined,
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_COMPLETE,
      entity: 'user',
      entityId: user._id.toString()
    });

    return sendResponse(true, "Password updated successfully");

  } catch (error: any) {
    return sendResponse(false, error.message, null, 500);
  }
}