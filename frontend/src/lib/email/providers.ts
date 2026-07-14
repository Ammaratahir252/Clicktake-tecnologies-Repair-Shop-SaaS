import 'server-only';

export interface SendResult {
  success: boolean;
  error?: string;
  providerReference?: string;
}

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

async function sendViaResend({ to, subject, html, apiKey, fromName, fromEmail, replyTo }: SendArgs): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, providerReference: (data as any)?.id };
    }
    return { success: false, error: (data as any)?.message || `Resend responded ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Resend error' };
  }
}

async function sendViaMailerSend({ to, subject, html, apiKey, fromName, fromEmail, replyTo }: SendArgs): Promise<SendResult> {
  try {
    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        html,
        ...(replyTo ? { reply_to: { email: replyTo } } : {}),
      }),
    });

    if (res.status === 202) {
      return { success: true, providerReference: res.headers.get('x-message-id') || undefined };
    }
    const errBody = await res.json().catch(() => ({}));
    return { success: false, error: (errBody as any)?.message || `MailerSend responded ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'MailerSend error' };
  }
}

async function sendViaMailtrap({ to, subject, html, apiKey, fromName, fromEmail, replyTo }: SendArgs): Promise<SendResult> {
  const inboxId = process.env.MAILTRAP_INBOX_ID;
  const endpoint = inboxId
    ? `https://sandbox.api.mailtrap.io/api/send/${inboxId}`
    : 'https://send.api.mailtrap.io/api/send';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        html,
        ...(replyTo ? { reply_to: { email: replyTo } } : {}),
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

export const EMAIL_PROVIDERS: Record<string, { send: (args: SendArgs) => Promise<SendResult>; envKey: string }> = {
  resend: { send: sendViaResend, envKey: 'RESEND_API_KEY' },
  mailersend: { send: sendViaMailerSend, envKey: 'MAILERSEND_API_KEY' },
  mailtrap: { send: sendViaMailtrap, envKey: 'MAILTRAP_API_KEY' },
};

export const DEFAULT_PROVIDER = 'resend';
