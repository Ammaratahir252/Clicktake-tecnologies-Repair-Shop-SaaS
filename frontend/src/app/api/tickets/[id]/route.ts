// src/app/api/tickets/[id]/route.ts

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getTicketByIdHandler } from '../../../../modules/tickets/ticket.controller';
import connectDB from '../../../../lib/db';
import Ticket from '../../../../models/ticket.model';
import { sendResponse } from '../../../../utils/apiResponse';
import { destroyImage, publicIdFromUrl } from '../../../../lib/uploads/cloudinary';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return getTicketByIdHandler(req, params.id);
}

// DELETE /api/tickets/:id — owner (or platform admin) only, matching the UI,
// which only exposes the delete button on the owner tickets page. This handler
// did not exist before: the delete button 405'd. Cleans up the ticket's
// Cloudinary photos and its logged time sessions.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!['owner', 'super_admin'].includes(role)) {
      return sendResponse(false, 'Forbidden: only the shop owner can delete tickets', null, 403);
    }
    if (!mongoose.Types.ObjectId.isValid(params.id) || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return sendResponse(false, 'Invalid ticket ID', null, 400);
    }

    const ticket = await Ticket.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(params.id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);

    // Best-effort cleanup of cloud photos + logged time; the ticket is already gone.
    void (async () => {
      for (const photo of ticket.photos ?? []) {
        await destroyImage(photo.publicId || publicIdFromUrl(photo.url));
      }
      const TimeSession = (await import('../../../../models/timeSession.model')).default;
      await TimeSession.deleteMany({ ticketId: ticket._id }).catch(() => {});
    })();

    return sendResponse(true, 'Ticket deleted', { id: params.id });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
