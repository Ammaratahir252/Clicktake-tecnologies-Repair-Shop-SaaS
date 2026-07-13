import type { INotificationProvider, SendPayload, SendResult } from '../provider.interface';

export class MailerSendAdapter implements INotificationProvider {
  readonly channel = 'email' as const;
  readonly providerId = 'mailersend';

  async send(payload: SendPayload): Promise<SendResult> {
    const { to, subject, body, title, apiKey } = payload;

    const key = apiKey || process.env.MAILERSEND_API_KEY || '';
    if (!key) {
      return { success: false, error: 'MailerSend API key not configured' };
    }

    if (!to || !to.includes('@')) {
      return { success: false, error: `Invalid email address: ${to}` };
    }

    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@dibnow.com';
    const fromName  = process.env.NOTIFICATION_FROM_NAME  || 'Dibnow Repair';

    try {
      const res = await fetch('https://api.mailersend.com/v1/email', {
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

      if (res.status === 202) {
        return { success: true, providerReference: res.headers.get('x-message-id') || undefined };
      }

      const errBody = await res.json().catch(() => ({}));
      const message = (errBody as any)?.message || `MailerSend responded ${res.status}`;
      return { success: false, error: message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'MailerSend error' };
    }
  }
}
