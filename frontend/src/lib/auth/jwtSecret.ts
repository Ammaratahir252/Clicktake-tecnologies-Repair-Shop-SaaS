// src/lib/auth/jwtSecret.ts
// Single source of truth for the JWT signing secret. There is deliberately NO
// fallback value: a missing JWT_SECRET must fail closed with a clear server
// configuration error, never silently sign/verify tokens with a public string.
// Edge-safe (no Node-only imports) so middleware can use it too.

export class JwtConfigError extends Error {
  constructor() {
    super('Server configuration error: JWT_SECRET is not set. Authentication is disabled until it is configured.');
    this.name = 'JwtConfigError';
  }
}

/** The raw secret for jsonwebtoken (Node runtime). Throws JwtConfigError if unset. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new JwtConfigError();
  return secret;
}

/** The secret as bytes for `jose` (Edge runtime / middleware). Throws JwtConfigError if unset. */
export function getJwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/** Non-throwing check for callers that need to branch on configuration state. */
export function isJwtConfigured(): boolean {
  return !!process.env.JWT_SECRET;
}
