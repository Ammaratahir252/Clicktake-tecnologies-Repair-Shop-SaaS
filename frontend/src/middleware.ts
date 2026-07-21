import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getClientIp } from '@/lib/ipWhitelist';
import { getJwtSecretBytes, isJwtConfigured } from '@/lib/auth/jwtSecret';

// Identity headers only middleware may set (from a verified JWT). Any value the
// CLIENT sends for these must be discarded before the request reaches a route
// handler — otherwise pass-through paths would forward spoofable identity.
const IDENTITY_HEADERS = [
  'x-tenant-id',
  'x-user-id',
  'x-role',
  'x-user-name',
  'x-permissions',
  'x-impersonating',
  'x-subdomain',
];

function setIdentityHeaders(headers: Headers, payload: any): void {
  headers.set('x-tenant-id', String(payload.tenantId ?? ''));
  headers.set('x-user-id',   String(payload.userId  ?? ''));
  headers.set('x-role',      String(payload.role    ?? ''));
  headers.set('x-user-name', String(payload.name    ?? 'Staff'));
}

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

/** API route groups gated by feature flags — checked once a valid JWT exists. */
const API_FLAG_RULES: { test: (p: string) => boolean; flag: string; label: string }[] = [
  { test: (p) => p.startsWith('/api/parts') || p.startsWith('/api/stock-movements'), flag: 'enableInventory', label: 'Inventory' },
  { test: (p) => p.startsWith('/api/tickets') || p.startsWith('/api/time-sessions'), flag: 'enableTickets', label: 'Tickets' },
  { test: (p) => p.startsWith('/api/ai') && p !== '/api/ai/chat', flag: 'enableAI', label: 'AI Assistant' },
  { test: (p) => p.startsWith('/api/analytics'), flag: 'enableAnalytics', label: 'Analytics' },
];

// ─── Route Definitions ────────────────────────────────────────────────────────

/** Routes logged-in users should NOT visit (redirect to dashboard) */
const AUTH_ROUTES = ['/login', '/register'];

/** Password flow routes — always public, no auth required */
const PUBLIC_ROUTES = ['/forgot-password', '/reset-password'];

// ─── API auth model: default-deny ─────────────────────────────────────────────
// Every /api/* path requires a verified JWT UNLESS it is explicitly listed below.
// This is the opposite of an allow-list: a new route is protected automatically
// the moment it's added, and must be deliberately opted OUT of auth here to be
// public. (The prior allow-list model let two routes — /api/billing/status and
// /api/delivery-jobs/my — silently ship with zero auth because nobody remembered
// to add them to a matcher array; see the 2026-07-20 audit, Critical #1/#2.)
const PUBLIC_API_EXACT = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/verify-otp',
  '/api/auth/verify-session',
  '/api/admin/setup',
  '/api/billing/checkout',
  '/api/billing/plans',
  '/api/repair-requests',
  '/api/shops',
  '/api/tenant/resolve',
]);

const PUBLIC_API_PREFIXES = [
  '/api/public/',   // branding, feature-flags, contact-us, request-demo, shops directory
  '/api/webhooks/', // gateway signature verified independently in-handler
  '/api/cron/',     // CRON_SECRET bearer verified independently in-handler
];

/** Gateway postback targets — each one is a specific gateway's own public callback URL, not a user request. */
const PUBLIC_API_EXACT_CALLBACKS = new Set([
  '/api/payments/easypaisa/callback',
  '/api/payments/jazzcash/callback',
  '/api/payments/paypal/callback',
  '/api/payments/stripe/callback',
]);

function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname) || PUBLIC_API_EXACT_CALLBACKS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

// ─── Main Middleware ───────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  for (const h of IDENTITY_HEADERS) requestHeaders.delete(h);

  // Fail closed when the JWT secret is missing: every matched path either needs
  // authentication or participates in the auth flow, and none of that can be
  // done safely without a real secret. (There is intentionally no fallback.)
  if (!isJwtConfigured()) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: JWT_SECRET is not set. Authentication is disabled until it is configured.' },
        { status: 500 }
      );
    }
    if (pathname.startsWith('/dashboard')) {
      return new NextResponse(
        '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-size:1.4rem">Server configuration error</h1><p style="color:#666">JWT_SECRET is not set — sign-in is disabled until the server is configured.</p></div></body></html>',
        { status: 500, headers: { 'content-type': 'text/html' } }
      );
    }
    // Public/auth pages (login, register, …) may still render.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

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
      const { payload } = await jwtVerify(token, getJwtSecretBytes());

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

  // ─── 2. API ROUTES — default-deny: protected unless explicitly public ────
  if (pathname.startsWith('/api/')) {

    // AI Chat is the one deliberately optional-auth API — a public site-wide
    // assistant widget that also works for anonymous visitors. It attaches
    // identity headers only when a valid session exists, but never blocks
    // the request for lack of one.
    if (pathname === '/api/ai/chat') {
      const payload = await verifyToken();
      if (payload) {
        if (flagBlocked(payload, 'enableAI')) return flagBlockedResponse('AI Assistant');
        const role = String(payload.role ?? '');
        setIdentityHeaders(requestHeaders, payload);
        applyImpersonation(requestHeaders, req, role);
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Public shop reviews: GET /api/reviews?public=true is a deliberately
    // unauthenticated read mode the route handler itself implements (it scopes
    // to isPublic:true documents only, optionally by subdomain). Every other
    // method/query on /api/reviews still requires a verified session below.
    if (pathname === '/api/reviews' && req.method === 'GET' && req.nextUrl.searchParams.get('public') === 'true') {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (isPublicApiPath(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Everything else under /api/ requires a verified JWT.
    const payload = await verifyToken();
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: missing or invalid token' },
        { status: 401 }
      );
    }
    const role = String(payload.role ?? '');

    // Admin routes: super-admin IP allowlist + permissions header, and impersonation
    // is deliberately NOT applied — admin panel APIs always use real super_admin context.
    if (pathname.startsWith('/api/admin')) {
      if ((payload as any).__ipBlocked) {
        return NextResponse.json(
          { success: false, message: 'Access blocked: this network is not on the super-admin IP whitelist.' },
          { status: 403 }
        );
      }
      setIdentityHeaders(requestHeaders, payload);
      if (Array.isArray((payload as any).permissions)) {
        requestHeaders.set('x-permissions', (payload as any).permissions.join(','));
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // POST /api/users is restricted to roles allowed to create staff accounts.
    if (pathname.startsWith('/api/users') && req.method === 'POST') {
      const allowedRoles = ['owner', 'manager', 'super_admin'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: insufficient permissions to create users' },
          { status: 403 }
        );
      }
    }

    // Feature-flag-gated API groups.
    const flagRule = API_FLAG_RULES.find((r) => r.test(pathname));
    if (flagRule && flagBlocked(payload, flagRule.flag)) {
      return flagBlockedResponse(flagRule.label);
    }

    setIdentityHeaders(requestHeaders, payload);

    // GPS/driver routes are never impersonated — a super admin browsing a
    // tenant's data shouldn't be able to push fake driver GPS updates.
    if (!pathname.startsWith('/api/driver')) {
      applyImpersonation(requestHeaders, req, role);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 3. DASHBOARD ROUTES — redirect to /login if not authenticated ────────
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

  // ─── 4. AUTH ROUTES — redirect logged-in users to dashboard ──────────────
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await verifyToken();
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ─── 5. Everything else — pass through ────────────────────────────────────
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/:path*',
  ],
};
