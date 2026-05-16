import { NextRequest } from 'next/server';
// Using direct relative paths for reliable module resolution
import connectDB from '../../../../lib/db';
import { AuthService } from '../../../../modules/auth/auth.service';
import { sendResponse } from '../../../../utils/apiResponse';

// ✅ CORRECTED IMPORTS: createAuditLog comes from service, AUDIT_ACTIONS comes from model
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';

/**
 * POST: /api/auth/login
 * Core authentication logic: Connects to DB, validates credentials, 
 * and issues a secure session token.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Parse incoming credentials from the request body
    const { email, password } = await req.json();
    
    // 3. Authenticate user via AuthService
    // This service handles password hashing and JWT signing
    const { token, user } = await AuthService.loginUser(email, password);

    /**
     * NEW: Audit Log Integration
     * We trigger this immediately after successful authentication.
     * It does not block the response (no 'await' used here for speed).
     */
    createAuditLog({
      tenantId: user.tenantId, // Assuming user object has tenantId
      userId: user._id || user.id,
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entity: 'user',
      entityId: user._id || user.id,
      details: { email: user.email },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    });
    
    /**
     * 4. Standardized Success Response
     * IMPORTANT: We explicitly pass the token in the data object 
     * so the Frontend can save it to LocalStorage.
     */
    const response = sendResponse(true, 'Login successful. Welcome back!', { 
      user, 
      token // Sent to frontend for LocalStorage
    });
    
    /**
     * 5. Enhanced Security Layer (HTTP-Only Cookie)
     * Provides an extra layer of protection against XSS attacks.
     */
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // Token valid for 24 hours
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error("Login API Failure:", error.message);

    /**
     * 6. Error Handling
     * Returns a 401 Unauthorized status if credentials fail.
     */
    return sendResponse(
      false, 
      error.message || 'Authentication failed. Please verify your credentials.', 
      null, 
      401
    );
  }
}