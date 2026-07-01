// Mock env config BEFORE importing the module
jest.mock('../../../config/env', () => ({
  env: {
    ENCRYPTION_KEY: '12345678901234567890123456789012', // exactly 32 bytes
  },
}));

// Mock errors to avoid InternalError import issue
jest.mock('../../../errors', () => ({
  InternalError: class InternalError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

import { encrypt, decrypt, hashForLookup, generateSecureToken, generateOTP, secureCompare, maskCardNumber, maskEmail, maskPhone } from '../index';

describe('encrypt / decrypt', () => {
  it('returns a string with iv:tag:data format', () => {
    const result = encrypt('hello');
    const parts = result.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(32); // iv hex = 16 bytes
    expect(parts[1]).toHaveLength(32); // tag hex = 16 bytes
  });

  it('decrypts back to original plaintext', () => {
    const plain = 'IMEI-123456789';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const e1 = encrypt('test');
    const e2 = encrypt('test');
    expect(e1).not.toBe(e2);
  });

  it('decrypts unicode / special chars', () => {
    const val = 'SN: £500 €200 #!@';
    expect(decrypt(encrypt(val))).toBe(val);
  });

  it('throws on tampered ciphertext', () => {
    const enc = encrypt('secret');
    const tampered = enc.slice(0, -4) + 'XXXX';
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on invalid format (missing colons)', () => {
    expect(() => decrypt('notvalidformat')).toThrow();
  });
});

describe('hashForLookup', () => {
  it('returns a 64-char hex string', () => {
    const h = hashForLookup('test-value');
    expect(h).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(h)).toBe(true);
  });

  it('is deterministic', () => {
    expect(hashForLookup('abc')).toBe(hashForLookup('abc'));
  });

  it('different values produce different hashes', () => {
    expect(hashForLookup('abc')).not.toBe(hashForLookup('xyz'));
  });

  it('normalises case (lowercase)', () => {
    expect(hashForLookup('ABC')).toBe(hashForLookup('abc'));
  });

  it('trims whitespace before hashing', () => {
    expect(hashForLookup('  abc  ')).toBe(hashForLookup('abc'));
  });
});

describe('generateSecureToken', () => {
  it('returns hex string of correct length (default 32 bytes = 64 hex chars)', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it('respects custom byte length', () => {
    expect(generateSecureToken(16)).toHaveLength(32);
    expect(generateSecureToken(64)).toHaveLength(128);
  });

  it('generates unique tokens', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });
});

describe('generateOTP', () => {
  it('returns 6-digit string by default', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('pads with leading zeros if needed', () => {
    // run many times to probabilistically hit a small number
    for (let i = 0; i < 50; i++) {
      const otp = generateOTP(6);
      expect(otp).toHaveLength(6);
    }
  });

  it('respects custom digit length', () => {
    expect(generateOTP(4)).toHaveLength(4);
    expect(generateOTP(8)).toHaveLength(8);
  });
});

describe('secureCompare', () => {
  it('returns true for equal strings', () => {
    expect(secureCompare('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(secureCompare('abc123', 'xyz789')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(secureCompare('abc', 'abcd')).toBe(false);
  });
});

describe('mask helpers', () => {
  it('maskCardNumber masks all but last 4', () => {
    expect(maskCardNumber('4111111111111234')).toBe('****-****-****-1234');
  });

  it('maskEmail masks local part', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('maskPhone shows last 4 digits', () => {
    expect(maskPhone('+923001234567')).toBe('***4567');
  });
});