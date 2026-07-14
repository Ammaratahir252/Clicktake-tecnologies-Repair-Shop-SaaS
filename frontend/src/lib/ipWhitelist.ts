// Super-admin IP whitelist helpers.
// Pure string/number logic only — this module is imported from middleware.ts,
// so it must stay Edge-runtime compatible (no mongoose, no node built-ins).

/**
 * Normalize an IP string for comparison: trim, lowercase, strip an appended
 * port on IPv4 ("203.0.113.4:5123"), unwrap IPv4-mapped IPv6 ("::ffff:1.2.3.4"),
 * and fold the IPv6 loopback onto the IPv4 one so localhost matches either way.
 */
export function normalizeIp(raw: string): string {
  let ip = raw.trim().toLowerCase();
  const v4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) ip = v4WithPort[1];
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

/**
 * Best-effort client IP: first hop of x-forwarded-for (the client, as set by
 * the platform proxy on Vercel / `next start`), then x-real-ip. Returns null
 * when neither header is present rather than guessing.
 */
export function getClientIp(req: { headers: Headers }): string | null {
  const xff = req.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  if (first) return normalizeIp(first);
  const real = req.headers.get('x-real-ip');
  if (real) return normalizeIp(real);
  return null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = n * 256 + Number(p);
  }
  return n;
}

/** Accepts a single IPv4/IPv6 address or an IPv4 CIDR range like 198.51.100.0/24. */
export function isValidWhitelistEntry(entry: string): boolean {
  const e = normalizeIp(entry);
  const parts = e.split('/');
  if (parts.length > 2) return false;
  if (parts.length === 2) {
    if (!/^\d{1,2}$/.test(parts[1]) || Number(parts[1]) > 32) return false;
    return ipv4ToInt(parts[0]) !== null;
  }
  if (ipv4ToInt(e) !== null) return true;
  // Plain IPv6 — hex groups with at least one colon (compressed forms allowed)
  return e.includes(':') && /^[0-9a-f:]+$/.test(e) && !e.includes(':::');
}

/**
 * True when `ip` is covered by the whitelist. An EMPTY whitelist means the
 * feature is off (everyone allowed) — matching the login route's historical
 * semantics. A non-empty whitelist with an undeterminable IP fails closed.
 */
export function isIpWhitelisted(ip: string | null, whitelist: string[] | undefined | null): boolean {
  if (!whitelist || whitelist.length === 0) return true;
  if (!ip) return false;
  const norm = normalizeIp(ip);
  const ipInt = ipv4ToInt(norm);
  for (const raw of whitelist) {
    const entry = normalizeIp(String(raw));
    if (entry === norm) return true;
    const slash = entry.indexOf('/');
    if (slash === -1 || ipInt === null) continue;
    const baseInt = ipv4ToInt(entry.slice(0, slash));
    const prefix = Number(entry.slice(slash + 1));
    if (baseInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) continue;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    if (((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0)) return true;
  }
  return false;
}
