import type { INotificationProvider, SendPayload, SendResult } from '../provider.interface';

export class MailtrapAdapter implements INotificationProvider {
  readonly channel = 'email' as const;
  readonly providerId = 'mailtrap';

  async send(payload: SendPayload): Promise<SendResult> {
    const { to, subject, body, title, apiKey } = payload;

    const key = apiKey || process.env.MAILTRAP_API_KEY || '';
    if (!key) {
      return { success: false, error: 'Mailtrap API key not configured' };
    }

    if (!to || !to.includes('@')) {
      return { success: false, error: `Invalid email address: ${to}` };
    }

    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@dibnow.com';
    const fromName  = process.env.NOTIFICATION_FROM_NAME  || 'Dibnow Repair';

    // No verified sending domain yet → route through the sandbox testing inbox.
    // Sandbox mode captures the email in the Mailtrap inbox UI instead of actually
    // delivering it to `to` — that's expected until a real domain is attached
    // (drop MAILTRAP_INBOX_ID once one is verified to switch to real delivery).
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    const endpoint = inboxId
      ? `https://sandbox.api.mailtrap.io/api/send/${inboxId}`
      : 'https://send.api.mailtrap.io/api/send';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: fromName },
          to: [{ email: to }],
          subject: subject || title,
          html: body,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (data as any)?.success !== false) {
        return { success: true, providerReference: (data as any)?.message_ids?.[0] };
      }

      const message = (data as any)?.errors?.join?.(', ') || (data as any)?.message || `Mailtrap responded ${res.status}`;
      return { success: false, error: message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Mailtrap error' };
    }
  }
}
