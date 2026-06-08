// src/app/api/parts/route.ts
import { NextRequest } from 'next/server';
import { getPartsHandler, createPartHandler } from '@/modules/inventory/part.controller';

export async function GET(req: NextRequest) {
  return getPartsHandler(req);
}

export async function POST(req: NextRequest) {
  return createPartHandler(req);
}
