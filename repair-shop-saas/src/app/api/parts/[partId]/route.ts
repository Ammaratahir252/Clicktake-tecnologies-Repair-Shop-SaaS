// src/app/api/parts/[partId]/route.ts
import { NextRequest } from 'next/server';
import {
  getPartByIdHandler,
  updatePartHandler,
  deletePartHandler,
} from '@/modules/inventory/part.controller';

export async function GET(req: NextRequest, { params }: { params: { partId: string } }) {
  return getPartByIdHandler(req, params.partId);
}

export async function PATCH(req: NextRequest, { params }: { params: { partId: string } }) {
  return updatePartHandler(req, params.partId);
}

export async function DELETE(req: NextRequest, { params }: { params: { partId: string } }) {
  return deletePartHandler(req, params.partId);
}
