import { NextRequest } from 'next/server';
import crypto from 'crypto';
import User from '../../../../models/user.model';
import connectDB from '../../../../lib/db';
import { sendResponse } from '../../../../utils/apiResponse';
import { createAuditLog } from '../../../../services/auditLog.service';
import { AUDIT_ACTIONS } from '../../../../models/auditLog.model';
import { sendEmail, emailPasswordReset } from '../../../../lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      // Return success regardless to avoid email enumeration
      return sendResponse(true, "If that email exists, a reset link has been sent.", null, 200);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    createAuditLog({
      tenantId: user.tenantId ? user.tenantId.toString() : undefined,
      userId: user._id.toString(),
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUEST,
      entity: 'user',
      entityId: user._id.toString()
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    // Send reset email (fire-and-forget — never block the response)
    sendEmail(
      email,
      'Reset your password',
      emailPasswordReset(user.name, resetLink)
    );

    // Do NOT return the raw token here — a real email provider is configured
    // (see lib/email/providers.ts), so the reset link only ever reaches the
    // actual inbox. Returning it in the API response would let anyone who
    // knows a user's email fetch a working reset token without ever touching
    // that inbox, defeating the whole point of email-based verification.
    return sendResponse(true, "If that email exists, a reset link has been sent.", null, 200);

  } catch (error: any) {
    return sendResponse(false, error.message, null, 500);
  }
}
