import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import { sendResponse } from '../../../../utils/apiResponse';
import { getTenantBySubdomain } from '../../../../lib/subdomain';
import Tenant from '../../../../models/tenant.model';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';
import { sendEmail, emailTwoFactorCode } from '../../../../lib/notifications';
import { getPlatformSettings, isMaintenanceActive } from '@/lib/platformSettings';
import { getClientIp, isIpWhitelisted } from '@/lib/ipWhitelist';
import { issueSession } from '@/lib/auth/issueSession';
import { notifySuperAdmins } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();
    const settings = await getPlatformSettings();
    const clientIp = getClientIp(req);
    const ip = clientIp || 'unknown';

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(false, 'Invalid email or password.', null, 401);
    }

    // Fails closed: with a non-empty whitelist, an undeterminable IP is blocked too.
    if (user.role === 'super_admin' && !isIpWhitelisted(clientIp, settings.adminIpWhitelist)) {
      return sendResponse(false, 'Login blocked: this network is not on the super-admin IP whitelist.', null, 403);
    }

    const xTenantId = req.headers.get('x-tenant-id');
    const xSubdomain = req.headers.get('x-subdomain');

    let requestTenantId = xTenantId;
    if (!requestTenantId && xSubdomain) {
      const tenant = await getTenantBySubdomain(xSubdomain);
      if (tenant) {
        requestTenantId = tenant._id.toString();
      }
    }

    if (requestTenantId && user.tenantId && user.tenantId.toString() !== requestTenantId) {
      return sendResponse(false, 'Invalid email or password.', null, 401);
    }

    if (user.isActive === false) {
      return sendResponse(false, 'This account has been deactivated.', null, 403);
    }

    // A suspended/deactivated shop (owner Danger Zone, or super-admin suspension) must
    // block every login for that tenant, not just the pages behind the auth middleware —
    // otherwise staff can still sign in and get a fresh session after "deactivation".
    if (user.role !== 'super_admin' && user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId).select('isActive').lean() as any;
      if (tenant && tenant.isActive === false) {
        return sendResponse(false, 'This shop has been deactivated. Contact platform support to reactivate.', null, 403);
      }
    }

    if (isMaintenanceActive(settings) && user.role !== 'super_admin') {
      return sendResponse(false, settings.maintenanceMessage || 'The platform is currently under maintenance. Please try again shortly.', null, 503);
    }

    if (settings.emergencyLockdown && user.role !== 'super_admin') {
      return sendResponse(false, 'The platform is under an emergency lockdown. Only super admins may log in right now.', null, 503);
    }

    if (settings.requireEmailVerification && !user.emailVerified) {
      return sendResponse(false, 'Please verify your email address before logging in — check your inbox for the verification link.', null, 403);
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return sendResponse(false, `Account locked. Try again in ${minutesLeft} minute(s).`, null, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      createAuditLog({
        tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
        userId: user._id.toString(),
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        entity: 'user',
        entityId: user._id.toString(),
        details: { email: user.email, attempts },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      if (attempts >= settings.maxLoginAttempts) {
        await User.findByIdAndUpdate(user._id, {
          failedLoginAttempts: 0,
          lockoutUntil: new Date(Date.now() + settings.lockoutDurationMinutes * 60 * 1000),
        });
        if (settings.notifs.failedLoginAlert) {
          void notifySuperAdmins('Account Locked — Repeated Failed Logins', `<p>${user.email} was locked out after ${attempts} failed login attempts from IP ${ip}.</p>`);
        }
        return sendResponse(false, `Too many failed attempts. Account locked for ${settings.lockoutDurationMinutes} minutes.`, null, 423);
      }
      await User.findByIdAndUpdate(user._id, { failedLoginAttempts: attempts });
      return sendResponse(false, "Invalid email or password.", null, 401);
    }

    if (user.forcePasswordReset) {
      // Credentials are valid (bcrypt already matched above) — this is a guided
      // next step, not an error. The client keys off `requiresPasswordReset` the
      // same way it keys off `requiresOtp` below. A short-lived, single-use token
      // (same pattern as the OTP hash below) binds the completion call to *this*
      // successful password check — without it, anyone who merely learns the
      // userId (e.g. a teammate via /api/chat/contacts) could call
      // complete-password-reset directly and take over the account.
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      await User.findByIdAndUpdate(user._id, {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        forceResetTokenHash: resetTokenHash,
        forceResetTokenExpiry: Date.now() + 10 * 60 * 1000,
      });
      return sendResponse(true, 'Password reset required', {
        requiresPasswordReset: true,
        userId: user._id,
        resetToken,
      });
    }
    if (settings.passwordExpiryDays > 0 && user.passwordChangedAt) {
      const ageDays = (Date.now() - new Date(user.passwordChangedAt).getTime()) / 86_400_000;
      if (ageDays > settings.passwordExpiryDays) {
        return sendResponse(false, 'Your password has expired. Use "Forgot password" to set a new one.', null, 403);
      }
    }

    // Reset lockout counters without running full document validators
    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockoutUntil: null });

    const needsOtp =
      (user.role === 'super_admin' && settings.twoFactor) ||
      ((user.role === 'owner' || user.role === 'manager') && settings.twoFactorOwners);

    if (needsOtp) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 10);
      await User.findByIdAndUpdate(user._id, {
        twoFactorOtpHash: codeHash,
        twoFactorOtpExpiry: Date.now() + 10 * 60 * 1000,
      });

      createAuditLog({
        tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
        userId: user._id.toString(),
        action: AUDIT_ACTIONS.AUTH_OTP_SENT,
        entity: 'user',
        entityId: user._id.toString(),
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      sendEmail(user.email, 'Your verification code', emailTwoFactorCode(code)).catch(() => {});

      return sendResponse(true, 'Verification code sent to your email.', {
        requiresOtp: true,
        userId: user._id,
      });
    }

    return issueSession(user, req, settings.sessionTimeout, settings.preventMultipleSessions);

  } catch (error: any) {
    console.error("Login API Failure:", error.message);
    return sendResponse(
      false,
      error.message || 'Authentication failed. Please verify your credentials.',
      null,
      401
    );
  }
}