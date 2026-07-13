import { Worker, Job } from 'bullmq';
import { Notification } from '../schema/notification.schema';
import { TenantNotificationConfig } from '../schema/tenantNotificationConfig.schema';
import { decrypt } from '../../../utils/encryption';
import { ResendEmailAdapter } from '../providers/email/resend.adapter';
import { MailerSendAdapter } from '../providers/email/mailersend.adapter';
import { MailtrapAdapter } from '../providers/email/mailtrap.adapter';
import { TwilioSmsAdapter } from '../providers/sms/twilio.adapter';
import { InAppProvider } from '../providers/inApp.provider';
import type { NotificationJobData } from './notificationQueue';
import type { INotificationProvider } from '../providers/provider.interface';
import { logger } from '../../../utils/logger';

const connection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       parseInt(process.env.REDIS_DB || '0', 10),
};

const inAppProvider   = new InAppProvider();
const twilioAdapter   = new TwilioSmsAdapter();

// Email fallback chain: tries each provider in order until one succeeds.
// Order is configurable via EMAIL_PROVIDER_ORDER (comma-separated), default resend → mailersend → mailtrap.
const emailAdapters: Record<string, INotificationProvider> = {
  resend:     new ResendEmailAdapter(),
  mailersend: new MailerSendAdapter(),
  mailtrap:   new MailtrapAdapter(),
};

const EMAIL_PROVIDER_KEY_ENV: Record<string, string> = {
  resend:     'RESEND_API_KEY',
  mailersend: 'MAILERSEND_API_KEY',
  mailtrap:   'MAILTRAP_API_KEY',
};

function getEmailProviderOrder(): string[] {
  const configured = (process.env.EMAIL_PROVIDER_ORDER || 'resend,mailersend,mailtrap')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p in emailAdapters);
  return configured.length > 0 ? configured : ['resend', 'mailersend', 'mailtrap'];
}

async function sendEmailWithFallback(
  payload: Omit<Parameters<INotificationProvider['send']>[0], 'apiKey'>,
  config: { providerKeys?: Record<string, string> } | null
): Promise<{ success: boolean; providerReference?: string; error?: string; providerId?: string }> {
  const order = getEmailProviderOrder();
  let lastError = 'No email provider configured';

  for (const providerId of order) {
    const adapter = emailAdapters[providerId];

    let apiKey = process.env[EMAIL_PROVIDER_KEY_ENV[providerId]] || '';
    if (config?.providerKeys?.[providerId]) {
      try { apiKey = decrypt(config.providerKeys[providerId]); } catch { /* use platform key */ }
    }
    if (!apiKey) continue; // skip providers with no key configured at all

    const result = await adapter.send({ ...payload, apiKey });
    if (result.success) {
      return { ...result, providerId };
    }
    lastError = `${providerId}: ${result.error}`;
    logger.warn('Email provider failed, trying next in fallback chain', { providerId, error: result.error });
  }

  return { success: false, error: lastError };
}

async function processJob(job: Job<NotificationJobData>): Promise<void> {
  const { notificationId, tenantId, channel, to, subject, body, title, recipientUserId, recipientCustomerId } = job.data;

  // Resolve per-tenant provider config (for API key overrides)
  const config = await TenantNotificationConfig.findOne({ tenantId }).lean();

  let providerResult: { success: boolean; providerReference?: string; error?: string };

  try {
    if (channel === 'in_app') {
      providerResult = await inAppProvider.send({
        to,
        body,
        title,
        tenantId,
        notificationId,
        recipientUserId,
        recipientCustomerId,
      });
    } else if (channel === 'email') {
      providerResult = await sendEmailWithFallback(
        { to, subject, body, title, tenantId, notificationId },
        config
      );
    } else if (channel === 'sms') {
      let accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      let authToken  = process.env.TWILIO_AUTH_TOKEN  || '';
      let fromNumber = process.env.TWILIO_FROM_NUMBER || '';
      if (config?.providerKeys?.twilio) {
        try {
          const creds = JSON.parse(decrypt(config.providerKeys.twilio));
          accountSid = creds.accountSid || accountSid;
          authToken  = creds.authToken  || authToken;
          fromNumber = creds.fromNumber || fromNumber;
        } catch { /* use platform creds */ }
      }
      providerResult = await twilioAdapter.send({
        to, body, title, tenantId, notificationId,
        apiKey: JSON.stringify({ accountSid, authToken, fromNumber }),
      });
    } else {
      // Channel not yet implemented — log and treat as sent via in-app fallback
      providerResult = await inAppProvider.send({
        to: 'in_app', body, title, tenantId, notificationId, recipientUserId, recipientCustomerId,
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Notification delivery error', { notificationId, channel, error: errorMessage });
    providerResult = { success: false, error: errorMessage };
  }

  if (providerResult.success) {
    await Notification.findByIdAndUpdate(notificationId, {
      status: 'sent',
      sentAt: new Date(),
      providerReference: providerResult.providerReference,
    });
  } else {
    // On final attempt failure: mark failed + fall back to in-app
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;
    if (isLastAttempt) {
      await Notification.findByIdAndUpdate(notificationId, {
        status: 'failed',
        errorMessage: providerResult.error,
      });
      // In-app fallback — only if the original was not already in-app
      if (channel !== 'in_app' && (recipientUserId || recipientCustomerId)) {
        await inAppProvider.send({
          to: 'in_app', body, title, tenantId, notificationId: `${notificationId}_fallback`,
          recipientUserId, recipientCustomerId,
        }).catch(() => { /* best-effort fallback */ });
      }
    } else {
      // Re-throw so BullMQ retries the job
      throw new Error(providerResult.error || 'Delivery failed');
    }
  }
}

let _worker: Worker | null = null;

export const startNotificationWorker = (): Worker => {
  if (_worker) return _worker;

  _worker = new Worker<NotificationJobData>(
    'm7:notifications',
    processJob,
    {
      connection,
      concurrency: 10,
    }
  );

  _worker.on('completed', (job) =>
    logger.info('Notification job completed', { jobId: job.id, channel: job.data.channel })
  );
  _worker.on('failed', (job, err) =>
    logger.error('Notification job failed', { jobId: job?.id, error: err.message })
  );

  logger.info('M7 notification worker started');
  return _worker;
};
