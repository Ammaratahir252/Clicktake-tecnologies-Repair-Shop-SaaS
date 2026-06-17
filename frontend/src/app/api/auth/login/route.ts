import { NextRequest } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/user.model';
import { sendResponse } from '../../../../utils/apiResponse';
import { getTenantBySubdomain } from '../../../../lib/subdomain';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();
    
    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(false, 'Invalid email or password.', null, 401);
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

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      return sendResponse(false, `Account locked. Try again in ${minutesLeft} minute(s).`, null, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      if (attempts >= 5) {
        await User.findByIdAndUpdate(user._id, {
          failedLoginAttempts: 0,
          lockoutUntil: new Date(Date.now() + 15 * 60 * 1000),
        });
        return sendResponse(false, "Too many failed attempts. Account locked for 15 minutes.", null, 423);
      }
      await User.findByIdAndUpdate(user._id, { failedLoginAttempts: attempts });
      return sendResponse(false, "Invalid email or password.", null, 401);
    }

    // Reset lockout counters without running full document validators
    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockoutUntil: null });

    const token = jwt.sign(
      { 
        userId: user._id, 
        tenantId: user.tenantId, 
        role: user.role,
        tokenVersion: user.tokenVersion || 0
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1d' }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : user._id.toString(),
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entity: 'user',
      entityId: user._id.toString(),
      details: { email: user.email },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    });
    
    const response = sendResponse(true, 'Login successful. Welcome back!', { 
      user: userData, 
      token 
    });
    
    // Cookie must NOT be httpOnly — JS must be able to delete it on logout/401.
    response.cookies.set('token', token, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    });

    return response;

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