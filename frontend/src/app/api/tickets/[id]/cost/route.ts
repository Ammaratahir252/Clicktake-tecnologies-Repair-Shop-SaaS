// src/app/api/tickets/[id]/cost/route.ts

import { NextRequest } from 'next/server';
import { setActualCostHandler } from '../../../../../modules/tickets/ticket.controller';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return setActualCostHandler(req, params.id);
}
