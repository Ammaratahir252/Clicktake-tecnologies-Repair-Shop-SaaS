// src/app/api/tickets/[id]/location/route.ts

import { NextRequest } from 'next/server';
import { updateLocationHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateLocationHandler(req, params.id);
}
