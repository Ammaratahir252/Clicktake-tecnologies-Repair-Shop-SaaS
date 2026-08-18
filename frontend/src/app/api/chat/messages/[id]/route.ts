import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import ChatMessage from '@/models/chatMessage.model';
import { sendResponse } from '@/utils/apiResponse';

const STAFF_ROLES = ['owner', 'manager', 'frontdesk', 'technician', 'driver'];

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    role:     req.headers.get('x-role')      ?? '',
  };
}

// DELETE /api/chat/messages/:id — you can only ever delete your OWN message,
// and only within your own tenant (both enforced by the query filter itself,
// not a separate check after the fact).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);
    if (!STAFF_ROLES.includes(role)) return sendResponse(false, 'Forbidden', null, 403);
    if (!tenantId || tenantId.length !== 24) return sendResponse(false, 'Unauthorized', null, 401);

    const deleted = await ChatMessage.findOneAndDelete({
      _id: params.id,
      tenantId,
      senderId: userId,
    });
    if (!deleted) return sendResponse(false, 'Message not found', null, 404);

    return sendResponse(true, 'Message deleted');
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
