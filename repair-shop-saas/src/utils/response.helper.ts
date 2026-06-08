// src/utils/response.helper.ts
import { NextResponse } from 'next/server';

export function successResponse(message: string, data: any = null, status: number = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, message, data: null },
    { status }
  );
}
