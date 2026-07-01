import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Notification from '@/models/notification.model';
import mongoose from 'mongoose';

function getCtx(req: NextRequest) {
  return { userId: req.headers.get('x-user-id') ?? '' };
}

// PATCH /api/notifications/:id — mark single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  await connectDB();
  try {
    const { userId } = getCtx(req);
    if (!userId || userId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const notif = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
        recipientUserId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notif) return sendResponse(false, 'Not found', null, 404);
    return sendResponse(true, 'Marked as read', notif);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
