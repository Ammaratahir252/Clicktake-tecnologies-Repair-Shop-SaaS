import bcrypt from 'bcryptjs';

export interface PasswordComplexityOpts {
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSymbol?: boolean;
}

export function validatePassword(
  password: string,
  minLength: number = 8,
  opts: PasswordComplexityOpts = {}
): { valid: boolean; message: string } {
  if (!password || password.length < minLength)
    return { valid: false, message: `Password must be at least ${minLength} characters` };
  if ((opts.requireUppercase ?? true) && !/[A-Z]/.test(password))
    return { valid: false, message: "Password must contain at least 1 uppercase letter" };
  if ((opts.requireNumber ?? true) && !/[0-9]/.test(password))
    return { valid: false, message: "Password must contain at least 1 number" };
  if ((opts.requireSymbol ?? true) && !/[^A-Za-z0-9]/.test(password))
    return { valid: false, message: "Password must contain at least 1 special character" };
  return { valid: true, message: "OK" };
}

/** True if `password` matches the current hash or any hash in `history` (most recent first). */
export async function isPasswordReused(password: string, currentHash: string, history: string[]): Promise<boolean> {
  const candidates = [currentHash, ...history].filter(Boolean);
  for (const hash of candidates) {
    if (await bcrypt.compare(password, hash)) return true;
  }
  return false;
}
