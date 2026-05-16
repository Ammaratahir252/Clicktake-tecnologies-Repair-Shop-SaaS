import { NextResponse, NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import { jwtVerify } from 'jose';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Delete the token cookie server-side
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0), // immediately expired
    path: '/',
  });

  try {
    // Attempt to invalidate tokenVersion in DB
    const token = req.cookies.get('token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key');
      const { payload } = await jwtVerify(token, secret);
      
      await connectDB();
      const user = await User.findById(payload.userId);
      if (user) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        createAuditLog({
          tenantId: user.tenantId.toString(),
          userId: user._id.toString(),
          action: AUDIT_ACTIONS.AUTH_LOGOUT,
          entity: 'user',
          entityId: user._id.toString(),
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        });
      }
    }
  } catch (error) {
    console.error("Logout invalidation error", error);
  }

  return response;
}
