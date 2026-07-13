import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { sendResponse } from '@/utils/apiResponse';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { userId, token } = await req.json();
    if (!userId || !token) return sendResponse(false, 'Missing verification token', null, 400);

    const user = await User.findById(userId).select('emailVerified emailVerifyTokenHash emailVerifyExpiry');
    if (!user) return sendResponse(false, 'Account not found', null, 404);
    if (user.emailVerified) return sendResponse(true, 'Email already verified', null);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (!user.emailVerifyTokenHash || user.emailVerifyTokenHash !== tokenHash) {
      return sendResponse(false, 'Invalid verification link', null, 400);
    }
    if (!user.emailVerifyExpiry || user.emailVerifyExpiry < Date.now()) {
      return sendResponse(false, 'This verification link has expired. Please request a new one.', null, 400);
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpiry = undefined;
    await user.save();

    return sendResponse(true, 'Email verified — you can now log in.', null);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
