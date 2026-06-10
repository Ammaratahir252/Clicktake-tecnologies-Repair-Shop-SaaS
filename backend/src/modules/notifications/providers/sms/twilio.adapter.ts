import twilio from 'twilio';
import type { INotificationProvider, SendPayload, SendResult } from '../provider.interface';

export class TwilioSmsAdapter implements INotificationProvider {
  readonly channel = 'sms' as const;
  readonly providerId = 'twilio';

  async send(payload: SendPayload): Promise<SendResult> {
    const { to, body, apiKey } = payload;

    // apiKey is JSON: { accountSid, authToken, fromNumber }
    let accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    let authToken  = process.env.TWILIO_AUTH_TOKEN  || '';
    let fromNumber = process.env.TWILIO_FROM_NUMBER || '';

    if (apiKey) {
      try {
        const creds = JSON.parse(apiKey);
        accountSid = creds.accountSid || accountSid;
        authToken  = creds.authToken  || authToken;
        fromNumber = creds.fromNumber || fromNumber;
      } catch { /* use env defaults */ }
    }

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    if (!to || !to.startsWith('+')) {
      return { success: false, error: `Invalid phone number (must be E.164): ${to}` };
    }

    try {
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({
        body,
        from: fromNumber,
        to,
      });

      return {
        success: true,
        providerReference: message.sid,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Twilio error' };
    }
  }
}
