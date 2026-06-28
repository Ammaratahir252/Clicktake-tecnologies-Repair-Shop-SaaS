import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ─── Route Definitions ────────────────────────────────────────────────────────

/** Routes logged-in users should NOT visit (redirect to dashboard) */
const AUTH_ROUTES = ['/login', '/register'];

/** Password flow routes — always public, no auth required */
const PUBLIC_ROUTES = ['/forgot-password', '/reset-password'];

// ─── Main Middleware ───────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);

  // ─── 0. Subdomain Extraction ────────────────────────────────────────────────
  const host = req.headers.get('host') || '';
  const hostWithoutPort = host.split(':')[0];
  let subdomain = null;
  
  if (hostWithoutPort !== 'localhost' && hostWithoutPort !== 'dibnow.com' && hostWithoutPort !== 'www.dibnow.com') {
    const parts = hostWithoutPort.split('.');
    if ((parts.length > 2 && hostWithoutPort.endsWith('dibnow.com')) || (parts.length > 1 && hostWithoutPort.endsWith('localhost'))) {
      subdomain = parts[0] === 'www' ? null : parts[0];
    }
  }

  if (subdomain) {
    requestHeaders.set('x-subdomain', subdomain);
  }

  // ── Grab token from cookie OR Authorization header ────────────────────────
  let token = req.cookies.get('token')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // ── JWT verifier ──────────────────────────────────────────────────────────
  const verifyToken = async () => {
    if (!token) return null;
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_secret_key'
      );
      const { payload } = await jwtVerify(token, secret);
      
      // Edge-compatible database session validation (3 s timeout to prevent middleware hang)
      try {
        const verifyUrl = new URL(`/api/auth/verify-session?userId=${payload.userId}`, req.url);
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(verifyUrl.toString(), { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data.tokenVersion !== undefined && data.tokenVersion !== payload.tokenVersion) {
            return null; // Invalidated session
          }
        }
      } catch {
        // Fetch failed or timed out — treat token as valid (signature already verified above)
      }

      return payload;
    } catch {
      return null;
    }
  };

  // ─── 1. PUBLIC ROUTES — always allow, no token check ─────────────────────
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 2. API: /api/parts + /api/stock-movements — requires valid JWT ────────
  if (pathname.startsWith('/api/parts') || pathname.startsWith('/api/stock-movements')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 3. API: /api/tickets — requires valid JWT ────────────────────────────
  if (pathname.startsWith('/api/tickets')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 3. API: /api/users — requires valid JWT ─────────────────────────────
  if (pathname.startsWith('/api/users')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }

    // Protect POST requests to only allow owners and managers
    if (req.method === 'POST') {
      const allowedRoles = ['owner', 'manager', 'super_admin'];
      if (!allowedRoles.includes(String(payload.role))) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: insufficient permissions to create users' },
          { status: 403 }
        );
      }
    }

    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 3.5. API: /api/admin/* — requires valid JWT (super_admin only at route level) ─
  if (pathname.startsWith('/api/admin')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 3.6. API: /api/audit-logs — requires valid JWT ───────────────────────
  if (pathname.startsWith('/api/audit-logs')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }

    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }


  // ─── Notifications — requires valid JWT ──────────────────────────────────
  if (pathname.startsWith('/api/notifications')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── Leads & Shop Profile — requires valid JWT ───────────────────────────
  if (pathname.startsWith('/api/leads') || pathname.startsWith('/api/shop/')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── Reviews — requires valid JWT (except public reads) ──────────────────
  if (pathname.startsWith('/api/reviews')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── AI Routes /api/ai/* — requires valid JWT ─────────────────────────────
  if (pathname.startsWith('/api/ai')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── Analytics & Customers — requires valid JWT ───────────────────────────
  if (pathname.startsWith('/api/analytics') || pathname.startsWith('/api/customers')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      String(payload.role    ?? ''));
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 4. DASHBOARD ROUTES — redirect to /login if not authenticated ────────
  if (pathname.startsWith('/dashboard')) {
    const payload = await verifyToken();
    if (!payload) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 5. AUTH ROUTES — redirect logged-in users to dashboard ──────────────
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await verifyToken();
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 6. Everything else — pass through ────────────────────────────────────
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/tickets',
    '/api/tickets/:path*',
    '/api/users',
    '/api/users/:path*',
    '/api/audit-logs',
    '/api/audit-logs/:path*',
    '/api/parts',
    '/api/parts/:path*',
    '/api/stock-movements',
    '/api/stock-movements/:path*',
    '/api/ai/:path*',
    '/api/leads',
    '/api/leads/:path*',
    '/api/shop/:path*',
    '/api/reviews',
    '/api/reviews/:path*',
    '/api/admin',
    '/api/admin/:path*',
    '/api/analytics',
    '/api/analytics/:path*',
    '/api/customers',
    '/api/customers/:path*',
    '/api/notifications',
    '/api/notifications/:path*',
  ],
};