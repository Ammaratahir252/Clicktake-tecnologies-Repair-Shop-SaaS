// src/app/api/tickets/[id]/notes/route.ts

import { NextRequest } from 'next/server';
import { addNoteHandler } from '../../../../../modules/tickets/ticket.controller';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return addNoteHandler(req, params.id);
}
