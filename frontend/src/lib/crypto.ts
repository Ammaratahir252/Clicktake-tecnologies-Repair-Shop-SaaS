import 'server-only';
import crypto from 'crypto';

// AES-256-GCM at-rest encryption for secrets stored in Mongo (tenant payment
// gateway credentials). Key is derived via SHA-256 from ENCRYPTION_KEY so any
// passphrase length works, rather than requiring an exact 32-byte env value.
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'dev-only-fallback-key-change-me';
  return crypto.createHash('sha256').update(secret).digest();
}

/** Returns "iv:authTag:ciphertext", all hex-encoded. */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  if (!ivHex || !authTagHex || !dataHex) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
