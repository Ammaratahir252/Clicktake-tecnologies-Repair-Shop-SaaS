// src/app/api/stock-movements/route.ts
import { NextRequest } from 'next/server';
import { getAllStockMovementsHandler } from '@/modules/inventory/part.controller';

// Delegates to a handler that reads the caller's tenant from verified request
// headers — must never be statically prerendered at build time.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return getAllStockMovementsHandler(req);
}
