import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.cookies.get('token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    const res = await fetch(`${BACKEND}/api/delivery/my-jobs`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Delivery service unavailable' },
      { status: 503 }
    );
  }
}
