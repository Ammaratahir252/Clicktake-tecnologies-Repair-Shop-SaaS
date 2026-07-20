import { getJwtSecret, getJwtSecretBytes, isJwtConfigured, JwtConfigError } from '@/lib/auth/jwtSecret';

describe('jwtSecret helper', () => {
  let saved: string | undefined;
  beforeEach(() => { saved = process.env.JWT_SECRET; });
  afterEach(() => {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
  });

  test('throws JwtConfigError when JWT_SECRET is missing (no fallback)', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(JwtConfigError);
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET is not set/);
    expect(isJwtConfigured()).toBe(false);
  });

  test('never returns the old hardcoded fallback string implicitly', () => {
    delete process.env.JWT_SECRET;
    let value: string | null = null;
    try { value = getJwtSecret(); } catch { /* expected */ }
    expect(value).not.toBe('fallback_secret_key');
    expect(value).toBeNull();
  });

  test('returns the configured secret and byte form', () => {
    process.env.JWT_SECRET = 'a-very-long-random-secret';
    expect(getJwtSecret()).toBe('a-very-long-random-secret');
    expect(isJwtConfigured()).toBe(true);
    expect(Buffer.from(getJwtSecretBytes()).toString('utf8')).toBe('a-very-long-random-secret');
  });
});
