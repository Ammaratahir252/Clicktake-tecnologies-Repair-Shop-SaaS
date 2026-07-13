// Common disposable/temp-mail domains. Not exhaustive (there's no free
// authoritative source without a third-party API) — covers the popular ones
// people actually reach for when trying to dodge signup limits.
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz', 'sharklasers.com',
  'yopmail.com', 'yopmail.fr', 'throwawaymail.com', 'getnada.com', 'trashmail.com',
  'fakeinbox.com', 'maildrop.cc', 'mintemail.com', 'dispostable.com', 'mailnesia.com',
  'mohmal.com', 'moakt.com', 'emailondeck.com', 'discard.email', 'spamgourmet.com',
  'tempinbox.com', 'mytemp.email', 'temp-mail.io', '33mail.com', 'anonbox.net',
  'burnermail.io', 'byom.de', 'mailcatch.com', 'spambog.com', 'tempr.email',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
