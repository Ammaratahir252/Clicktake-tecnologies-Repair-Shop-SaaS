// src/app/api/tickets/[id]/photos/route.ts

import { NextRequest } from 'next/server';
import { addPhotoHandler } from '../../../../../modules/tickets/ticket.controller';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return addPhotoHandler(req, params.id);
}
