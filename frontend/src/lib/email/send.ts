import 'server-only';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import EmailLog from '@/models/emailLog.model';
import { EMAIL_PROVIDERS, DEFAULT_PROVIDER } from './providers';

export interface SendEmailOptions {
  /** 'marketing' sends are suppressed entirely when Settings → Email → Disable Marketing Emails is on. */
  category?: 'transactional' | 'marketing';
}

// Simple in-memory sliding-window limiter — resets on process restart. Good enough
// for a soft per-hour cap without needing Redis; not shared across horizontally
// scaled instances (this app runs as a single Next.js process).
const sendTimestamps: number[] = [];
function withinRateLimit(limit: number): boolean {
  if (!limit) return true;
  const cutoff = Date.now() - 60 * 60 * 1000;
  while (sendTimestamps.length && sendTimestamps[0] < cutoff) sendTimestamps.shift();
  if (sendTimestamps.length >= limit) return false;
  sendTimestamps.push(Date.now());
  return true;
}

interface EmailSettings {
  activeEmailProvider: string;
  defaultSenderName: string;
  defaultSenderEmail: string;
  replyToEmail: string;
  disableMarketingEmails: boolean;
  emailRateLimitPerHour: number;
}

async function getEmailSettings(): Promise<EmailSettings> {
  const fallback: EmailSettings = {
    activeEmailProvider: DEFAULT_PROVIDER,
    defaultSenderName: process.env.NOTIFICATION_FROM_NAME || 'Dibnow Repair',
    defaultSenderEmail: process.env.NOTIFICATION_FROM_EMAIL || 'noreply@dibnow.com',
    replyToEmail: '',
    disableMarketingEmails: false,
    emailRateLimitPerHour: 0,
  };
  try {
    await connectDB();
    const s = await PlatformSettings.findOne()
      .select('activeEmailProvider defaultSenderName defaultSenderEmail replyToEmail disableMarketingEmails emailRateLimitPerHour')
      .lean() as any;
    if (!s) return fallback;
    return {
      activeEmailProvider: s.activeEmailProvider || fallback.activeEmailProvider,
      defaultSenderName: s.defaultSenderName || fallback.defaultSenderName,
      defaultSenderEmail: s.defaultSenderEmail || fallback.defaultSenderEmail,
      replyToEmail: s.replyToEmail || '',
      disableMarketingEmails: s.disableMarketingEmails ?? false,
      emailRateLimitPerHour: s.emailRateLimitPerHour || 0,
    };
  } catch {
    return fallback;
  }
}

/**
 * Sends an email through whichever single provider is set active in
 * Super Admin → Settings → Email. Sender name/address and reply-to come from
 * the same settings tab (env vars are only the fallback). No fallback chain —
 * switching the active provider fully shifts all outgoing mail to it.
 */
export async function sendPlatformEmail(to: string, subject: string, html: string, opts?: SendEmailOptions): Promise<boolean> {
  if (!to || !to.includes('@')) return false;

  const settings = await getEmailSettings();

  if (opts?.category === 'marketing' && settings.disableMarketingEmails) {
    await EmailLog.create({ to, subject, provider: 'none', status: 'suppressed', error: 'Marketing emails are disabled in platform settings' }).catch(() => {});
    return false;
  }

  if (!withinRateLimit(settings.emailRateLimitPerHour)) {
    await EmailLog.create({ to, subject, provider: 'none', status: 'failed', error: 'Hourly email rate limit reached' }).catch(() => {});
    console.error('[Email] Hourly rate limit reached — dropping send to', to);
    return false;
  }

  const providerId = settings.activeEmailProvider;
  const provider = EMAIL_PROVIDERS[providerId];
  if (!provider) {
    console.error('[Email] Unknown active provider:', providerId);
    await EmailLog.create({ to, subject, provider: providerId, status: 'failed', error: 'Unknown active provider' }).catch(() => {});
    return false;
  }

  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    console.error(`[Email] Active provider ${providerId} has no API key configured`);
    await EmailLog.create({ to, subject, provider: providerId, status: 'failed', error: 'No API key configured' }).catch(() => {});
    return false;
  }

  const result = await provider.send({
    to, subject, html, apiKey,
    fromName: settings.defaultSenderName,
    fromEmail: settings.defaultSenderEmail,
    replyTo: settings.replyToEmail && settings.replyToEmail.includes('@') ? settings.replyToEmail : undefined,
  });
  await EmailLog.create({
    to, subject, provider: providerId,
    status: result.success ? 'sent' : 'failed',
    error: result.success ? undefined : result.error,
  }).catch(() => {});

  if (result.success) return true;

  console.error(`[Email] ${providerId} failed:`, result.error);
  return false;
}

/** Re-sends a previously failed EmailLog entry through the current active provider. */
export async function retryEmailLog(id: string): Promise<boolean> {
  await connectDB();
  const log = await EmailLog.findById(id);
  if (!log || log.status === 'sent') return false;
  // We don't retain the original HTML body — retry re-sends a short notice pointing at the original subject.
  const ok = await sendPlatformEmail(log.to, `[Resent] ${log.subject}`, `<p>This is a resend of a previously failed platform email with subject: <strong>${log.subject}</strong>. If you need the original content, contact support.</p>`);
  return ok;
}
