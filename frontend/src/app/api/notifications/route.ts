import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Notification from '@/models/notification.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return {
    userId: req.headers.get('x-user-id') ?? '',
    role:   req.headers.get('x-role')    ?? '',
  };
}

// GET /api/notifications — fetch inbox for current user
export async function GET(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { userId } = getCtx(req);
    if (!userId || userId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    const [items, unread] = await Promise.all([
      Notification.find({ recipientUserId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({
        recipientUserId: new mongoose.Types.ObjectId(userId),
        readAt: null,
      }),
    ]);

    return sendResponse(true, 'Notifications fetched', { items, unread });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
