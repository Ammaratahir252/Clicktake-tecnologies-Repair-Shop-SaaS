// src/app/api/tickets/[id]/assign/route.ts

import { NextRequest } from 'next/server';
import { assignTechnicianHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return assignTechnicianHandler(req, params.id);
}
