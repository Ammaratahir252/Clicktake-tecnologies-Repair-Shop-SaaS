// src/app/api/tickets/[id]/payment/route.ts

import { NextRequest } from 'next/server';
import { recordPaymentHandler } from '../../../../../modules/tickets/ticket.controller';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return recordPaymentHandler(req, params.id);
}
