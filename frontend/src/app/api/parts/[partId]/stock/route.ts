// src/app/api/parts/[partId]/stock/route.ts
import { NextRequest } from 'next/server';
import {
  adjustStockHandler,
  getStockHistoryHandler,
} from '@/modules/inventory/part.controller';

export async function POST(req: NextRequest, { params }: { params: { partId: string } }) {
  return adjustStockHandler(req, params.partId);
}

export async function GET(req: NextRequest, { params }: { params: { partId: string } }) {
  return getStockHistoryHandler(req, params.partId);
}
