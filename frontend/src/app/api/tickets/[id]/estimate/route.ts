// src/app/api/tickets/[id]/estimate/route.ts

import { NextRequest } from 'next/server';
import { setEstimateHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return setEstimateHandler(req, params.id);
}
