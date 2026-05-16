import { NextRequest } from 'next/server';
import crypto from 'crypto';
import User from '../../../../models/user.model';
import { connectDB } from '../../../../lib/db';
import { errorResponse, successResponse } from '../../../../utils/response.helper';
import { createAuditLog, AUDIT_ACTIONS } from '../../../../services/auditLog.service';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // 1. Create a random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token before saving to DB (Security Best Practice)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    // 3. Log the request
    createAuditLog({
      tenantId: user.tenantId,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUEST,
      entity: 'user',
      entityId: user._id
    });

    // In a real app, send the raw 'resetToken' via email. 
    // For now, returning in response for testing.
    return successResponse("Reset link generated", { resetToken });

  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}