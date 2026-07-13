// src/app/api/tickets/[id]/assign-driver/route.ts

import { NextRequest } from 'next/server';
import { assignDriverHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return assignDriverHandler(req, params.id);
}
