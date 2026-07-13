import { NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import { sendResponse } from '../../../../utils/apiResponse';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';
import { getPlatformSettings } from '@/lib/platformSettings';
import { issueSession } from '@/lib/auth/issueSession';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, code } = await req.json();
    if (!userId || !code) {
      return sendResponse(false, 'Verification code is required.', null, 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(false, 'Invalid or expired verification session.', null, 401);
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return sendResponse(false, `Account locked. Try again in ${minutesLeft} minute(s).`, null, 423);
    }

    if (!user.twoFactorOtpHash || !user.twoFactorOtpExpiry || user.twoFactorOtpExpiry < Date.now()) {
      return sendResponse(false, 'Verification code has expired. Please log in again.', null, 401);
    }

    const isMatch = await bcrypt.compare(String(code), user.twoFactorOtpHash);

    if (!isMatch) {
      const settings = await getPlatformSettings();
      const attempts = (user.failedLoginAttempts || 0) + 1;

      createAuditLog({
        tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
        userId: user._id.toString(),
        action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
        entity: 'user',
        entityId: user._id.toString(),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      if (attempts >= settings.maxLoginAttempts) {
        await User.findByIdAndUpdate(user._id, {
          failedLoginAttempts: 0,
          lockoutUntil: new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000),
          twoFactorOtpHash: null,
          twoFactorOtpExpiry: null,
        });
        return sendResponse(false, `Too many failed attempts. Account locked for ${settings.lockoutDurationMinutes} minutes.`, null, 423);
      }

      await User.findByIdAndUpdate(user._id, { failedLoginAttempts: attempts });
      return sendResponse(false, 'Incorrect verification code.', null, 401);
    }

    await User.findByIdAndUpdate(user._id, {
      twoFactorOtpHash: null,
      twoFactorOtpExpiry: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_OTP_VERIFIED,
      entity: 'user',
      entityId: user._id.toString(),
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    const settings = await getPlatformSettings();
    return issueSession(user, req, settings.sessionTimeout, settings.preventMultipleSessions);

  } catch (error: any) {
    console.error('Verify OTP API Failure:', error.message);
    return sendResponse(false, error.message || 'Verification failed.', null, 500);
  }
}
