import { NextResponse, NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import { jwtVerify } from 'jose';
import { getJwtSecretBytes } from '../../../../lib/auth/jwtSecret';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS, AuditLog } from '../../../../models/auditLog.model';
import { sendEmail, emailSuperAdminActivityReport } from '../../../../lib/notifications';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Delete the token cookie server-side
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0), // immediately expired
    path: '/',
  });

  try {
    // Attempt to invalidate tokenVersion in DB. Accept the token from the
    // cookie OR the Authorization header — the same two places middleware
    // reads it from — so API-client logouts revoke the session too.
    const token =
      req.cookies.get('token')?.value ??
      (req.headers.get('authorization')?.startsWith('Bearer ')
        ? req.headers.get('authorization')!.substring(7)
        : undefined);
    if (token) {
      const { payload } = await jwtVerify(token, getJwtSecretBytes());
      
      await connectDB();
      const user = await User.findById(payload.userId);
      if (user) {
        const logoutIp = req.headers.get('x-forwarded-for') || 'unknown';

        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        createAuditLog({
          tenantId: user.tenantId ? user.tenantId.toString() : undefined,
          userId: user._id.toString(),
          action: AUDIT_ACTIONS.AUTH_LOGOUT,
          entity: 'user',
          entityId: user._id.toString(),
          ipAddress: logoutIp,
          userAgent: req.headers.get('user-agent') || 'unknown'
        });

        if (user.role === 'super_admin') {
          const lastLogin = await AuditLog.findOne({
            userId: user._id,
            action: AUDIT_ACTIONS.AUTH_LOGIN,
          }).sort({ createdAt: -1 }).lean() as any;

          const sessionStart = lastLogin?.createdAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

          const sessionActions = await AuditLog.find({
            userId: user._id,
            createdAt: { $gte: sessionStart },
            action: { $ne: AUDIT_ACTIONS.AUTH_LOGOUT },
          }).sort({ createdAt: 1 }).lean() as any[];

          sendEmail(
            'nowdib@gmail.com',
            'Super Admin Activity Report',
            emailSuperAdminActivityReport(
              sessionStart.toISOString ? sessionStart.toISOString() : new Date(sessionStart).toISOString(),
              new Date().toISOString(),
              logoutIp,
              sessionActions.map(a => ({
                action: a.action,
                entity: a.entity,
                createdAt: a.createdAt.toISOString(),
              }))
            )
          ).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Logout invalidation error", error);
  }

  return response;
}
