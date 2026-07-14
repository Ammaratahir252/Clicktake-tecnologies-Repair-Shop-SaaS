import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getClientIp } from '@/lib/ipWhitelist';

// ─── Impersonation helper ──────────────────────────────────────────────────────
/**
 * If the super admin has an active impersonation cookie, override x-tenant-id
 * with the impersonated tenant so all scoped API queries return that tenant's data.
 */
function applyImpersonation(headers: Headers, req: NextRequest, role: string): void {
  if (role !== 'super_admin') return;
  const imperCookie = req.cookies.get('imper')?.value;
  if (!imperCookie) return;
  try {
    const ctx = JSON.parse(decodeURIComponent(imperCookie));
    if (ctx?.tenantId) {
      headers.set('x-tenant-id', String(ctx.tenantId));
      headers.set('x-impersonating', 'true');
    }
  } catch {}
}

// ─── Feature-flag enforcement ─────────────────────────────────────────────────
/**
 * True when a platform feature flag disables this module for the requester.
 * Admin-tier accounts are exempt — flags gate tenant modules, and admins need
 * access to manage/inspect them regardless.
 */
function flagBlocked(payload: any, flagKey: string): boolean {
  const role = String(payload?.role ?? '');
  if (role === 'super_admin' || role === 'admin') return false;
  return payload?.__flags?.[flagKey] === false;
}

function flagBlockedResponse(moduleName: string): NextResponse {
  return NextResponse.json(
    { success: false, message: `The ${moduleName} module is currently disabled by the platform administrator.` },
    { status: 403 }
  );
}

/** Dashboard page sections gated by feature flags (APIs are gated separately). */
const PAGE_FLAG_RULES: { test: (p: string) => boolean; flag: string; label: string }[] = [
  { test: (p) => p.startsWith('/dashboard/customer'), flag: 'enableCustomerPortal', label: 'Customer Portal' },
  { test: (p) => /^\/dashboard\/[^/]+\/reports/.test(p), flag: 'enableReports', label: 'Reports' },
  { test: (p) => /^\/dashboard\/[^/]+\/inventory/.test(p), flag: 'enableInventory', label: 'Inventory' },
  { test: (p) => /^\/dashboard\/[^/]+\/tickets/.test(p), flag: 'enableTickets', label: 'Tickets' },
  { test: (p) => p.startsWith('/dashboard/technician/ai'), flag: 'enableAI', label: 'AI Assistant' },
];

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
        const clientIp = getClientIp(req) ?? '';
        const verifyUrl = new URL(`/api/auth/verify-session?userId=${payload.userId}&ip=${encodeURIComponent(clientIp)}`, req.url);
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(verifyUrl.toString(), { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data.tokenVersion !== undefined && data.tokenVersion !== payload.tokenVersion) {
            return null; // Invalidated session
          }
          if (data.maintenanceMode === true && payload.role !== 'super_admin') {
            return null; // Platform under maintenance — only super admins may proceed
          }
          // Whitelist violations are NOT a global session kill — they only gate
          // the admin panel (see the /api/admin and /dashboard/super-admin blocks).
          (payload as any).__ipBlocked = data.ipBlocked === true;
          (payload as any).__flags = data.flags ?? null;
          (payload as any).__readOnly = data.readOnlyMode === true;
          (payload as any).__lockdown = data.emergencyLockdown === true;
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

  // ─── 1.5. Read-only mode / emergency lockdown — block writes for everyone but super_admin ──
  // Centralized here (rather than duplicated in every route block below) so Read Only Mode
  // and Emergency Lockdown apply uniformly to all tenant-scoped API writes without needing to
  // touch each block. Admin and auth routes are exempt — admins must still be able to act,
  // and login/logout must keep working during a lockdown.
  const isTenantApiWrite =
    pathname.startsWith('/api/') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/auth');
  if (isTenantApiWrite) {
    const payload = await verifyToken();
    if (payload && payload.role !== 'super_admin' && ((payload as any).__lockdown || (payload as any).__readOnly)) {
      return NextResponse.json(
        {
          success: false,
          message: (payload as any).__lockdown
            ? 'The platform is under an emergency lockdown — write actions are disabled.'
            : 'The platform is in read-only mode — write actions are temporarily disabled.',
        },
        { status: 503 }
      );
    }
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
    if (flagBlocked(payload, 'enableInventory')) return flagBlockedResponse('Inventory');
    const requestHeaders = new Headers(req.headers);
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    if (flagBlocked(payload, 'enableTickets')) return flagBlockedResponse('Tickets');
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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

    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    // Admin IP whitelist — enforced ONLY here (admin panel APIs), not platform-wide.
    if ((payload as any).__ipBlocked) {
      return NextResponse.json(
        { success: false, message: 'Access blocked: this network is not on the super-admin IP whitelist.' },
        { status: 403 }
      );
    }
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    if (Array.isArray((payload as any).permissions)) {
      requestHeaders.set('x-permissions', (payload as any).permissions.join(','));
    }
    // Do NOT apply impersonation to /api/admin/* — admin routes must always use real super_admin context
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
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── Activity tracking (page views) — requires valid JWT ─────────────────
  if (pathname.startsWith('/api/activity')) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── AI Chat — public (site-wide assistant widget, works for anonymous
  // visitors too) — attaches identity headers only when a valid session
  // exists, but never blocks the request for lack of one.
  if (pathname === '/api/ai/chat') {
    const payload = await verifyToken();
    if (payload) {
      if (flagBlocked(payload, 'enableAI')) return flagBlockedResponse('AI Assistant');
      const role = String(payload.role ?? '');
      requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
      requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
      requestHeaders.set('x-role',      role);
      requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
      applyImpersonation(requestHeaders, req, role);
    }
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
    if (flagBlocked(payload, 'enableAI')) return flagBlockedResponse('AI Assistant');
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
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
    if (pathname.startsWith('/api/analytics') && flagBlocked(payload, 'enableAnalytics')) {
      return flagBlockedResponse('Analytics');
    }
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── Tenant self-service + Subscriptions + Payment initiation + Change Password — requires valid JWT ──
  // Note: every gateway's */callback route is deliberately NOT matched here (or in the
  // matcher config below) — those are the gateways' own public postback targets, not user requests.
  const PAYMENT_INITIATE_PATHS = [
    '/api/payments/easypaisa/initiate',
    '/api/payments/jazzcash/initiate',
    '/api/payments/stripe/initiate',
    '/api/payments/paypal/initiate',
  ];
  if (
    pathname.startsWith('/api/tenant') ||
    pathname.startsWith('/api/subscriptions') ||
    PAYMENT_INITIATE_PATHS.includes(pathname) ||
    pathname === '/api/payments' ||
    pathname === '/api/auth/change-password'
  ) {
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    const role = String(payload.role ?? '');
    requestHeaders.set('x-tenant-id', String(payload.tenantId ?? ''));
    requestHeaders.set('x-user-id',   String(payload.userId  ?? ''));
    requestHeaders.set('x-role',      role);
    requestHeaders.set('x-user-name', String(payload.name    ?? 'Staff'));
    applyImpersonation(requestHeaders, req, role);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── GPS: /api/driver/* — requires valid JWT (driver / super_admin) ──────
  if (pathname.startsWith('/api/driver')) {
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
      // Admin panel has its own login page — don't bounce admins to the tenant login.
      if (pathname.startsWith('/dashboard/super-admin')) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Feature-flag-disabled module pages → friendly 403 for tenant roles.
    for (const rule of PAGE_FLAG_RULES) {
      if (rule.test(pathname) && flagBlocked(payload, rule.flag)) {
        return new NextResponse(
          `<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-size:1.4rem">${rule.label} is currently disabled</h1><p style="color:#666">The platform administrator has turned this module off. Contact support if you believe this is a mistake.</p></div></body></html>`,
          { status: 403, headers: { 'content-type': 'text/html' } }
        );
      }
    }

    // Admin IP whitelist gates ONLY the super-admin panel pages — the rest of
    // the dashboard (and platform) stays fully usable from any network.
    if (pathname.startsWith('/dashboard/super-admin') && (payload as any).__ipBlocked) {
      return new NextResponse(
        '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-size:1.4rem">403 — Admin panel unavailable from this network</h1><p style="color:#666">Your IP is not on the super-admin whitelist. Connect from an approved network, or update the whitelist from one.</p></div></body></html>',
        { status: 403, headers: { 'content-type': 'text/html' } }
      );
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
    '/api/activity',
    '/api/activity/:path*',
    '/api/tenant',
    '/api/tenant/:path*',
    '/api/subscriptions',
    '/api/subscriptions/:path*',
    '/api/payments/easypaisa/initiate',
    '/api/payments/jazzcash/initiate',
    '/api/payments/stripe/initiate',
    '/api/payments/paypal/initiate',
    '/api/payments',
    '/api/auth/change-password',
    '/api/driver',
    '/api/driver/:path*',
  ],
};