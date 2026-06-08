// src/app/api/tickets/[id]/route.ts

import { NextRequest } from 'next/server';
import { getTicketByIdHandler } from '../../../../modules/tickets/ticket.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return getTicketByIdHandler(req, params.id);
}
