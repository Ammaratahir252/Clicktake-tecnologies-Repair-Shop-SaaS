export function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password || password.length < 8)
    return { valid: false, message: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: "Password must contain at least 1 uppercase letter" };
  if (!/[0-9]/.test(password))
    return { valid: false, message: "Password must contain at least 1 number" };
  if (!/[^A-Za-z0-9]/.test(password))
    return { valid: false, message: "Password must contain at least 1 special character" };
  return { valid: true, message: "OK" };
}
