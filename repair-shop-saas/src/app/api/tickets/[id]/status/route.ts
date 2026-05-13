// src/app/api/tickets/[id]/status/route.ts

import { NextRequest } from 'next/server';
import { updateStatusHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateStatusHandler(req, params.id);
}
