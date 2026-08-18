/** @type {import('next').NextConfig} */
//
// Added 2026-07-20 (audit remediation, Medium #15) — this file didn't exist
// before, meaning every response ran on pure Next.js defaults with no
// documented security-headers decision. The CSP here is intentionally
// permissive rather than strict: this app renders large inline `style={{}}`
// objects and literal `<style>` blocks throughout its public/auth pages
// (login, register, forgot/reset-password) and Next.js itself injects inline
// hydration `<script>` tags with no nonce wiring configured — a strict
// script-src/style-src would break those today. `connect-src` and `img-src`
// are pre-opened for Cloudinary, Mapbox, and Stripe so those integrations
// keep working the moment their real credentials are dropped in, with zero
// further code changes. Tightening this (nonce-based script-src, dropping
// 'unsafe-inline') is a real future improvement, but needs live browser
// testing to do safely — not attempted here since no browser tool was
// available to verify it wouldn't silently break page rendering.
const csp = [
  "default-src 'self'",
  // GpsMap.tsx loads Mapbox GL JS straight from api.mapbox.com's CDN (no npm
  // package) and it spawns blob: web workers internally — both are required
  // for the map to render at all once NEXT_PUBLIC_MAPBOX_TOKEN is real, not
  // just for network calls.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
  "worker-src 'self' blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org https://api.mapbox.com",
  "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://res.cloudinary.com https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.paypal.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  // Self-hosted on cPanel (Passenger/Node.js Selector), not Vercel — standalone
  // output traces only the production node_modules this app actually needs into
  // .next/standalone, so the shared-hosting box never has to run `npm install`
  // for the frontend at all (see .github/workflows/deploy-cpanel.yml).
  output: 'standalone',
  images: {
    // Branding logos/favicons/login backgrounds are uploaded to Cloudinary
    // (see /api/admin/branding/upload and /api/tenant/branding/upload, both
    // backed by lib/uploads/cloudinary.ts) — this is the only external host
    // next/image needs to be allowed to fetch and optimize.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
