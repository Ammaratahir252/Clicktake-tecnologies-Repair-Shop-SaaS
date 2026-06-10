import { Resend } from 'resend';
import type { INotificationProvider, SendPayload, SendResult } from '../provider.interface';

export class ResendEmailAdapter implements INotificationProvider {
  readonly channel = 'email' as const;
  readonly providerId = 'resend';

  async send(payload: SendPayload): Promise<SendResult> {
    const { to, subject, body, title, apiKey } = payload;

    const key = apiKey || process.env.RESEND_API_KEY || '';
    if (!key) {
      return { success: false, error: 'Resend API key not configured' };
    }

    if (!to || !to.includes('@')) {
      return { success: false, error: `Invalid email address: ${to}` };
    }

    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@dibnow.com';
    const fromName  = process.env.NOTIFICATION_FROM_NAME  || 'Dibnow Repair';

    try {
      const resend = new Resend(key);
      const { data, error } = await resend.emails.send({
        from:    `${fromName} <${fromEmail}>`,
        to:      [to],
        subject: subject || title,
        html:    body,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, providerReference: data?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Resend error' };
    }
  }
}
