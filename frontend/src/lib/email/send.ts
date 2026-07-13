import 'server-only';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import EmailLog from '@/models/emailLog.model';
import { EMAIL_PROVIDERS, DEFAULT_PROVIDER } from './providers';

// Simple in-memory sliding-window limiter — resets on process restart. Good enough
// for a soft per-hour cap without needing Redis; not shared across horizontally
// scaled instances (this app runs as a single Next.js process).
const sendTimestamps: number[] = [];
async function withinRateLimit(): Promise<boolean> {
  await connectDB();
  const settings = await PlatformSettings.findOne().select('emailRateLimitPerHour').lean() as any;
  const limit = settings?.emailRateLimitPerHour || 0;
  if (!limit) return true;
  const cutoff = Date.now() - 60 * 60 * 1000;
  while (sendTimestamps.length && sendTimestamps[0] < cutoff) sendTimestamps.shift();
  if (sendTimestamps.length >= limit) return false;
  sendTimestamps.push(Date.now());
  return true;
}

async function getActiveProvider(): Promise<string> {
  try {
    await connectDB();
    const settings = await PlatformSettings.findOne().lean() as any;
    return settings?.activeEmailProvider || DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

/**
 * Sends an email through whichever single provider is set active in
 * Super Admin → Settings → Email. No fallback chain — switching the active
 * provider fully shifts all outgoing mail to it.
 */
export async function sendPlatformEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!to || !to.includes('@')) return false;

  if (!(await withinRateLimit())) {
    await EmailLog.create({ to, subject, provider: 'none', status: 'failed', error: 'Hourly email rate limit reached' }).catch(() => {});
    console.error('[Email] Hourly rate limit reached — dropping send to', to);
    return false;
  }

  const providerId = await getActiveProvider();
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

  const result = await provider.send({ to, subject, html, apiKey });
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
