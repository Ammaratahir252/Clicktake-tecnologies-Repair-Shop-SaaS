import 'server-only';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailSuperAdminLoginAlert } from '@/lib/notifications';
import User from '@/models/user.model';
import Session from '@/models/session.model';
import { createSession } from '@/lib/sessions';
import { getPlatformLocale, formatPlatformDateTime } from '@/lib/locale';
import { getJwtSecret } from '@/lib/auth/jwtSecret';

/**
 * Issues a fully authenticated session for a user who has already passed
 * credential (and, if required, OTP) checks. Shared by the plain login route
 * and the OTP-verification route so both paths stay in sync — token shape,
 * cookie, audit log, and the super-admin login alert must never drift apart.
 *
 * `preventMultipleSessions`: when on, this login invalidates every session the
 * user already had (bumps tokenVersion so old JWTs stop verifying on their next
 * check, and revokes their Session rows) — only the newest login stays valid.
 */
export async function issueSession(user: any, req: NextRequest, sessionTimeoutMinutes: number, preventMultipleSessions = false) {
  const timeoutMinutes = Number.isFinite(sessionTimeoutMinutes) && sessionTimeoutMinutes > 0 ? sessionTimeoutMinutes : 60;
  const expiresInSeconds = Math.round(timeoutMinutes * 60);

  let effectiveTokenVersion = user.tokenVersion || 0;
  if (preventMultipleSessions) {
    effectiveTokenVersion += 1;
    await User.findByIdAndUpdate(user._id, { tokenVersion: effectiveTokenVersion });
    await Session.updateMany({ userId: user._id, revoked: false }, { revoked: true, revokedAt: new Date() });
  }

  const token = jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
      tokenVersion: effectiveTokenVersion,
      permissions: user.role === 'admin' ? (user.permissions || []) : undefined,
    },
    getJwtSecret(),
    { expiresIn: expiresInSeconds }
  );

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenantId,
    permissions: user.role === 'admin' ? (user.permissions || []) : undefined,
  };

  const loginIp = req.headers.get('x-forwarded-for') || 'unknown';
  const loginUserAgent = req.headers.get('user-agent') || 'unknown';

  createAuditLog({
    tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
    userId: user._id.toString(),
    action: AUDIT_ACTIONS.AUTH_LOGIN,
    entity: 'user',
    entityId: user._id.toString(),
    details: { email: user.email },
    ipAddress: loginIp,
    userAgent: loginUserAgent,
  });

  if (user.role === 'super_admin') {
    getPlatformLocale()
      .then((locale) =>
        sendEmail(
          'nowdib@gmail.com',
          'Super Admin Login Alert',
          emailSuperAdminLoginAlert(loginIp, loginUserAgent, formatPlatformDateTime(new Date(), locale))
        )
      )
      .catch(() => {});
  }

  User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).catch(() => {});
  createSession({
    userId: user._id.toString(),
    tenantId: user.tenantId ? user.tenantId.toString() : null,
    role: user.role,
    ipAddress: loginIp,
    userAgent: loginUserAgent,
  }).catch(() => {});

  const response = sendResponse(true, 'Login successful. Welcome back!', {
    user: userData,
    token,
  });

  // Cookie must NOT be httpOnly — JS must be able to delete it on logout/401.
  response.cookies.set('token', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: expiresInSeconds,
    path: '/',
  });

  return response;
}
