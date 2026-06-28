import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Notification from '@/models/notification.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return { userId: req.headers.get('x-user-id') ?? '' };
}

// PATCH /api/notifications/read-all
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { userId } = getCtx(req);
    if (!userId || userId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    await Notification.updateMany(
      { recipientUserId: new mongoose.Types.ObjectId(userId), readAt: null },
      { $set: { readAt: new Date() } }
    );
    return sendResponse(true, 'All notifications marked as read', null);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
