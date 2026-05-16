import { NextRequest } from 'next/server';
import crypto from 'crypto';
import User from '../../../../models/user.model';
import { connectDB } from '../../../../lib/db';
import { errorResponse, successResponse } from '../../../../utils/response.helper';
import { createAuditLog, AUDIT_ACTIONS } from '../../../../services/auditLog.service';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    await connectDB();

    // 1. Hash the incoming token to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse("Token is invalid or has expired", 400);
    }

    // 2. Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    // 3. Log the completion
    createAuditLog({
      tenantId: user.tenantId,
      userId: user._id,
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_COMPLETE,
      entity: 'user',
      entityId: user._id
    });

    return successResponse("Password updated successfully");

  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}