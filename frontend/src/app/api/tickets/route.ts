// src/app/api/tickets/route.ts

import { NextRequest } from 'next/server';
import {
  getTicketsHandler,
  createTicketHandler,
} from '../../../modules/tickets/ticket.controller';

export async function GET(req: NextRequest) {
  return getTicketsHandler(req);
}

export async function POST(req: NextRequest) {
  return createTicketHandler(req);
}
