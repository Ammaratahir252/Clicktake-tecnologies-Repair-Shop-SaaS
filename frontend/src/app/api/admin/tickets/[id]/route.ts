import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'tickets');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const ticket = await Ticket.findById(params.id)
      .populate('tenantId', 'name subdomain')
      .populate('technicianId', 'name email')
      .populate('customerId', 'name phone email')
      .lean();

    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);
    return sendResponse(true, 'Ticket fetched', ticket);
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
