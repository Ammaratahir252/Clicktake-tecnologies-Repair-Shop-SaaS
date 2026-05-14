import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that logged-in users should NOT be able to visit
const AUTH_ROUTES = ['/login', '/register'];

// Route prefixes that require a valid token
const PROTECTED_ROUTES = ['/dashboard', '/api/tickets'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Grab token from cookie or Authorization header ───────────────────────
  let token = req.cookies.get('token')?.value;

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // ─── Helper: verify JWT and return payload (or null) ──────────────────────
  const verifyToken = async () => {
    if (!token) return null;
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_secret_key'
      );
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch {
      return null;
    }
  };

  // ─── 1. API ROUTES — return JSON errors, never redirect ───────────────────
  if (pathname.startsWith('/api/tickets')) {
    const payload = await verifyToken();

    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }

    // Forward decoded claims to route handlers via request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id', String(payload.userId ?? ''));
    requestHeaders.set('x-role', String(payload.role ?? ''));
    requestHeaders.set('x-user-name', String(payload.name ?? 'Staff'));

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 2. DASHBOARD ROUTES — redirect to /login if not authenticated ────────
  if (pathname.startsWith('/dashboard')) {
    const payload = await verifyToken();

    if (!payload) {
      const loginUrl = new URL('/login', req.url);
      // Preserve the intended destination so login can redirect back
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ─── 3. AUTH ROUTES (/login, /register) — redirect to /dashboard if already
  //        logged in so users don't land on the login page unnecessarily ──────
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await verifyToken();

    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  }

  // ─── 4. Everything else — pass through ───────────────────────────────────
  return NextResponse.next();
}

export const config = {
  /*
   * Match:
   *   - /dashboard and every sub-path
   *   - /login and /register
   *   - /api/tickets and every sub-path
   *
   * Exclude Next.js internals and static assets so the middleware
   * doesn't run on every _next/static or favicon request.
   */
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/api/tickets',
    '/api/tickets/:path*',
  ],
};