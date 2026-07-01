import { NextRequest } from 'next/server';
import crypto from 'crypto';
import User from '../../../../models/user.model';
import connectDB from '../../../../lib/db';
import { sendResponse } from '../../../../utils/apiResponse';
import { validatePassword } from '../../../../utils/passwordPolicy';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    const pwdValidation = validatePassword(newPassword);
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

    // 2. Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    // 3. Log the completion
    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : 'unknown',
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