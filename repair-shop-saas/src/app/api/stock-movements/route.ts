// src/app/api/stock-movements/route.ts
import { NextRequest } from 'next/server';
import { getAllStockMovementsHandler } from '@/modules/inventory/part.controller';

export async function GET(req: NextRequest) {
  return getAllStockMovementsHandler(req);
}
