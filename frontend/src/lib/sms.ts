import 'server-only';

/**
 * Twilio SMS sender — fetch-based, no SDK dependency.
 *
 * Configure with three env vars:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *
 * When they're absent, isSmsConfigured() is false and callers (currently the
 * automation engine's send_sms action) surface an honest "no provider
 * configured" notice instead of pretending the text was sent.
 */

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export interface SmsResult {
  success: boolean;
  error?: string;
  sid?: string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!isSmsConfigured()) return { success: false, error: 'SMS provider not configured' };

  const phone = to.trim();
  // Twilio requires E.164 (+<country><number>) — reject obvious garbage early.
  if (!/^\+?[0-9][0-9\s-]{6,17}$/.test(phone)) {
    return { success: false, error: `"${to}" is not a valid phone number` };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone.startsWith('+') ? phone : `+${phone.replace(/[\s-]/g, '')}`,
        From: from,
        Body: body.slice(0, 1600),
      }).toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, sid: (data as any)?.sid };
    return { success: false, error: (data as any)?.message || `Twilio responded ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Twilio request failed' };
  }
}
