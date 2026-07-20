// src/app/api/tickets/[id]/parts/route.ts
// M2-M3 bridge — use a part on a repair ticket
import { NextRequest } from 'next/server';
import { recordPartUsageOnTicketHandler } from '@/modules/inventory/part.controller';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return recordPartUsageOnTicketHandler(req, params.id);
}
