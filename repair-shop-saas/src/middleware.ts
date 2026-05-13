import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/tickets')) {
    return NextResponse.next();
  }

  let token = req.cookies.get('token')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return NextResponse.json({ success: false, message: 'No token' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_secret_key'
    );
    const { payload } = await jwtVerify(token, secret);

    // 🚨 DEBUG LOGS ADDED HERE 🚨
    console.log('--- MIDDLEWARE DEBUG ---');
    console.log('1. Raw Tenant ID from Token:', payload.tenantId);
    console.log('2. Length of Tenant ID:', String(payload.tenantId ?? '').length);
    console.log('------------------------');

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id', String(payload.userId ?? ''));
    requestHeaders.set('x-role', String(payload.role ?? ''));
    requestHeaders.set('x-user-name', String(payload.name ?? 'Staff'));

    return NextResponse.next({ request: { headers: requestHeaders } });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/tickets', '/api/tickets/:path*'],
};