// ============================================================
// DibnowRepairSaaS — AES-256 Encryption Utility
// Used for: IMEI, payment gateway refs, API keys at rest
// NEVER use for passwords — use bcrypt for passwords
// ============================================================

import crypto from 'crypto';
import { env } from '../../config/env';
import { InternalError } from '../../errors';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // GCM auth tag

// Derive a fixed 32-byte key from the env variable
const getKey = (): Buffer => {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf8');
  if (key.length !== KEY_LENGTH) {
    return crypto.createHash('sha256').update(key).digest(); // normalize to 32 bytes
  }
  return key;
};

// ─── Encrypt a string value ───────────────────────────────────
// Returns: iv:authTag:encryptedData (all hex encoded, colon separated)
export const encrypt = (plaintext: string): string => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Store as iv:tag:data — all needed for decryption
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new InternalError('Encryption failed');
  }
};

// ─── Decrypt a previously encrypted value ────────────────────
export const decrypt = (encryptedData: string): string => {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new InternalError('Decryption failed');
  }
};

// ─── Hash sensitive identifiers for lookup ───────────────────
// Used when you need to search by an encrypted field (e.g., find by IMEI)
// Store both encrypted value AND hash. Query by hash, display decrypted.
export const hashForLookup = (value: string): string => {
  return crypto
    .createHmac('sha256', env.ENCRYPTION_KEY)
    .update(value.toLowerCase().trim())
    .digest('hex');
};

// ─── Secure random token generation ──────────────────────────
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

// ─── Generate OTP ─────────────────────────────────────────────
export const generateOTP = (digits = 6): string => {
  const max = Math.pow(10, digits);
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return String(randomNumber % max).padStart(digits, '0');
};

// ─── Constant-time comparison (prevents timing attacks) ───────
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// ─── Mask sensitive data for logs ─────────────────────────────
export const maskCardNumber = (cardNumber: string): string => {
  return `****-****-****-${cardNumber.slice(-4)}`;
};

export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

export const maskPhone = (phone: string): string => {
  return `***${phone.slice(-4)}`;
};
