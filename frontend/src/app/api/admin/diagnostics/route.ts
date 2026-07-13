import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'settings');
}

type Status = 'ok' | 'warning' | 'error';

interface DiagnosticResult {
  id: string;
  category: string;
  label: string;
  status: Status;
  message: string;
  detail?: string;
  fix?: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function safeCheck(
  id: string,
  category: string,
  label: string,
  fn: () => Promise<Omit<DiagnosticResult, 'id' | 'category' | 'label'>>
): Promise<DiagnosticResult> {
  try {
    const result = await fn();
    return { id, category, label, ...result };
  } catch (err: any) {
    return {
      id,
      category,
      label,
      status: 'error',
      message: 'Check failed unexpectedly',
      detail: err?.message || String(err),
    };
  }
}

// Placeholders in this repo's .env files aren't always prefix-anchored —
// e.g. "whsec_your_stripe_webhook_secret" or "https://your_sentry_dsn@...".
// Match anywhere in the string, not just at the start.
const PLACEHOLDER_PATTERNS = [/your_/i, /REPLACE_WITH_/i];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

// ─── Individual checks ──────────────────────────────────────────────────────

const CONNECTION_STATE_NAMES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

async function checkMongo(): Promise<DiagnosticResult> {
  return safeCheck('mongo', 'Database', 'MongoDB Connection', async () => {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      return {
        status: 'error',
        message: `Connection state is "${CONNECTION_STATE_NAMES[mongoose.connection.readyState] ?? 'unknown'}", not connected.`,
        detail: `readyState=${mongoose.connection.readyState}`,
        fix: 'Check MONGODB_URI in .env.local and that the Atlas cluster is reachable.',
      };
    }
    await mongoose.connection.db!.admin().ping();
    return { status: 'ok', message: `Connected to database "${mongoose.connection.name}".` };
  });
}

async function checkJwtSecret(): Promise<DiagnosticResult> {
  return safeCheck('jwt_secret', 'Core Secrets', 'JWT_SECRET', async () => {
    const val = process.env.JWT_SECRET;
    if (!val) {
      return {
        status: 'error',
        message: 'JWT_SECRET is not set — falling back to a public, hardcoded default.',
        fix: 'Set JWT_SECRET in .env.local to a long random string. Every login and session check uses this.',
      };
    }
    if (val === 'fallback_secret_key') {
      return {
        status: 'error',
        message: 'JWT_SECRET is literally the fallback string used in code — anyone can forge session tokens.',
        fix: 'Generate a real secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))" and set JWT_SECRET.',
      };
    }
    if (val.length < 32) {
      return { status: 'warning', message: `JWT_SECRET is only ${val.length} characters — recommend 64+.`, fix: 'Regenerate a longer secret.' };
    }
    return { status: 'ok', message: 'Set and sufficiently long.' };
  });
}

async function checkActiveEmailProvider(): Promise<DiagnosticResult> {
  return safeCheck('email_provider', 'Email', 'Active Email Provider', async () => {
    await connectDB();
    const settings = await PlatformSettings.findOne().select('activeEmailProvider').lean() as any;
    const provider = settings?.activeEmailProvider || 'resend';

    const envKeyMap: Record<string, string> = {
      resend: 'RESEND_API_KEY',
      mailersend: 'MAILERSEND_API_KEY',
      mailtrap: 'MAILTRAP_API_KEY',
    };
    const envKey = envKeyMap[provider];
    const apiKey = envKey ? process.env[envKey] : undefined;

    if (!envKey) {
      return { status: 'error', message: `Unknown active provider "${provider}" — not one of resend/mailersend/mailtrap.`, fix: 'Fix activeEmailProvider in Super Admin → Settings → Email.' };
    }
    if (!apiKey) {
      return { status: 'error', message: `${envKey} is not set, but "${provider}" is the active provider — all outgoing email will fail.`, fix: `Set ${envKey} in .env.local, or switch the active provider in Settings.` };
    }

    const endpoints: Record<string, () => Promise<Response>> = {
      resend: () => fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${apiKey}` } }),
      mailersend: () => fetch('https://api.mailersend.com/v1/domains', { headers: { Authorization: `Bearer ${apiKey}` } }),
      mailtrap: () => fetch('https://mailtrap.io/api/accounts', { headers: { Authorization: `Bearer ${apiKey}` } }),
    };

    try {
      const res = await withTimeout(endpoints[provider](), 5000, `${provider} API did not respond within 5s`);
      if (res.ok) {
        return { status: 'ok', message: `${provider} API key is valid and reachable.` };
      }
      const body = await res.text().catch(() => '');
      return {
        status: 'error',
        message: `${provider} rejected the API key (HTTP ${res.status}).`,
        detail: body.slice(0, 300),
        fix: `Check ${envKey} in .env.local against the ${provider} dashboard.`,
      };
    } catch (err: any) {
      return { status: 'error', message: `Could not reach ${provider}'s API.`, detail: err.message, fix: 'Check network access from the server, or try again — this may be transient.' };
    }
  });
}

async function checkFromEmail(): Promise<DiagnosticResult> {
  return safeCheck('from_email', 'Email', 'Sender Address', async () => {
    const from = process.env.NOTIFICATION_FROM_EMAIL;
    if (!from) {
      return { status: 'warning', message: 'NOTIFICATION_FROM_EMAIL is not set — defaulting to noreply@dibnow.com.', fix: 'Set NOTIFICATION_FROM_EMAIL to an address on your verified sending domain.' };
    }
    return { status: 'ok', message: `Sending as ${from}.` };
  });
}

async function checkActiveAiProvider(): Promise<DiagnosticResult> {
  return safeCheck('ai_provider', 'AI', 'Active AI Provider', async () => {
    await connectDB();
    const settings = await PlatformSettings.findOne().select('aiProvider').lean() as any;
    const provider = settings?.aiProvider || 'groq';

    const envKeyMap: Record<string, string> = {
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GEMINI_API_KEY',
      glm: 'GLM_API_KEY',
    };
    const envKey = envKeyMap[provider];
    const apiKey = envKey ? process.env[envKey] : undefined;

    if (!envKey) {
      return { status: 'error', message: `Unknown active AI provider "${provider}".`, fix: 'Fix aiProvider in Super Admin → Settings → AI Models.' };
    }
    if (!apiKey) {
      return { status: 'error', message: `${envKey} is not set, but "${provider}" is the active AI provider — all AI features will fail.`, fix: `Set ${envKey} in .env.local, or switch the provider in Settings.` };
    }

    const endpoints: Record<string, () => Promise<Response>> = {
      groq: () => fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } }),
      openai: () => fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } }),
      google: () => fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`),
      glm: () => fetch('https://open.bigmodel.cn/api/paas/v4/models', { headers: { Authorization: `Bearer ${apiKey}` } }),
    };

    try {
      const res = await withTimeout(endpoints[provider](), 5000, `${provider} API did not respond within 5s`);
      if (res.ok) {
        return { status: 'ok', message: `${provider} API key is valid and reachable.` };
      }
      const body = await res.text().catch(() => '');
      return {
        status: 'error',
        message: `${provider} rejected the API key (HTTP ${res.status}).`,
        detail: body.slice(0, 300),
        fix: `Check ${envKey} in .env.local.`,
      };
    } catch (err: any) {
      return { status: 'error', message: `Could not reach ${provider}'s API.`, detail: err.message, fix: 'Check network access from the server, or try again — this may be transient.' };
    }
  });
}

async function checkStripe(): Promise<DiagnosticResult> {
  return safeCheck('stripe', 'Payments', 'Stripe', async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (isPlaceholder(key)) {
      return { status: 'warning', message: 'STRIPE_SECRET_KEY is missing or a placeholder — billing features will fail.', fix: 'Set a real STRIPE_SECRET_KEY from the Stripe dashboard.' };
    }
    try {
      const res = await withTimeout(
        fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } }),
        5000,
        'Stripe API did not respond within 5s'
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { status: 'error', message: `Stripe rejected the secret key (HTTP ${res.status}).`, detail: body.slice(0, 300), fix: 'Check STRIPE_SECRET_KEY.' };
      }
    } catch (err: any) {
      return { status: 'error', message: 'Could not reach Stripe.', detail: err.message };
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (isPlaceholder(webhookSecret)) {
      return {
        status: 'warning',
        message: 'Stripe key is valid, but STRIPE_WEBHOOK_SECRET is still a placeholder — incoming Stripe webhooks will fail signature verification.',
        fix: 'Set the real signing secret from the Stripe webhook dashboard.',
      };
    }
    return { status: 'ok', message: 'Secret key and webhook secret are both configured.' };
  });
}

async function checkCloudinary(): Promise<DiagnosticResult> {
  return safeCheck('cloudinary', 'Storage', 'Cloudinary', async () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (isPlaceholder(cloudName) || isPlaceholder(apiKey) || isPlaceholder(apiSecret)) {
      return { status: 'error', message: 'Cloudinary credentials are missing — photo/file uploads will fail.', fix: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.' };
    }
    try {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const res = await withTimeout(
        fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, { headers: { Authorization: `Basic ${auth}` } }),
        5000,
        'Cloudinary API did not respond within 5s'
      );
      if (res.ok) return { status: 'ok', message: 'Credentials valid and reachable.' };
      const body = await res.text().catch(() => '');
      return { status: 'error', message: `Cloudinary rejected the credentials (HTTP ${res.status}).`, detail: body.slice(0, 300), fix: 'Check CLOUDINARY_* values against the Cloudinary dashboard.' };
    } catch (err: any) {
      return { status: 'error', message: 'Could not reach Cloudinary.', detail: err.message };
    }
  });
}

async function checkPaymentGateways(): Promise<DiagnosticResult> {
  return safeCheck('local_gateways', 'Payments', 'PayPal / JazzCash / EasyPaisa', async () => {
    const configured: string[] = [];
    const unconfigured: string[] = [];

    if (!isPlaceholder(process.env.PAYPAL_CLIENT_ID) && !isPlaceholder(process.env.PAYPAL_CLIENT_SECRET)) configured.push('PayPal');
    else unconfigured.push('PayPal');

    if (!isPlaceholder(process.env.JAZZCASH_MERCHANT_ID) && !isPlaceholder(process.env.JAZZCASH_PASSWORD)) configured.push('JazzCash');
    else unconfigured.push('JazzCash');

    if (!isPlaceholder(process.env.EASYPAISA_STORE_ID) && !isPlaceholder(process.env.EASYPAISA_HASH_KEY)) configured.push('EasyPaisa');
    else unconfigured.push('EasyPaisa');

    if (unconfigured.length === 3) {
      return { status: 'warning', message: 'None of PayPal, JazzCash, or EasyPaisa are configured (still placeholder values).', fix: 'Fill in real credentials for any gateway you intend to accept payments through.' };
    }
    if (unconfigured.length > 0) {
      return { status: 'warning', message: `${configured.join(', ')} configured. Still placeholders: ${unconfigured.join(', ')}.` };
    }
    return { status: 'ok', message: 'All three gateways have credentials set (values not live-verified).' };
  });
}

async function checkSentry(): Promise<DiagnosticResult> {
  return safeCheck('sentry', 'Monitoring', 'Error Monitoring (Sentry)', async () => {
    if (isPlaceholder(process.env.SENTRY_DSN)) {
      return { status: 'warning', message: 'SENTRY_DSN is not configured — server exceptions are not being tracked anywhere.', fix: 'Set SENTRY_DSN if you want centralized error tracking.' };
    }
    return { status: 'ok', message: 'SENTRY_DSN is set.' };
  });
}

async function checkRedisQueue(): Promise<DiagnosticResult> {
  return safeCheck('redis_queue', 'Background Jobs', 'Redis / Notification Queue', async () => {
    const configured = !!process.env.REDIS_HOST || !!process.env.REDIS_URL;
    if (!configured) {
      return {
        status: 'warning',
        message: 'No REDIS_HOST/REDIS_URL configured — this checks configuration only (no live ping). The BullMQ notification worker in backend/ cannot run without it.',
        fix: 'Set REDIS_HOST (or REDIS_URL) if you want the background notification queue/worker to run.',
      };
    }
    return { status: 'ok', message: 'Redis connection is configured (configuration check only — not a live ping).' };
  });
}

async function checkAppEnvironment(): Promise<DiagnosticResult> {
  return safeCheck('app_env', 'System', 'Version / Build / Environment', async () => {
    let version = '0.0.0';
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const raw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
      version = JSON.parse(raw).version ?? version;
    } catch { /* fall back to 0.0.0 */ }
    return {
      status: 'ok',
      message: `v${version} · ${process.env.NODE_ENV ?? 'development'} · Node ${process.version}`,
    };
  });
}

async function checkSsl(req: NextRequest): Promise<DiagnosticResult> {
  return safeCheck('ssl', 'System', 'SSL / HTTPS', async () => {
    const proto = req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '');
    if (proto === 'https') return { status: 'ok', message: 'Request arrived over HTTPS.' };
    if (process.env.NODE_ENV !== 'production') return { status: 'warning', message: 'Running over HTTP — expected in local development.' };
    return { status: 'error', message: 'Production request arrived over plain HTTP — no TLS termination detected.', fix: 'Put the app behind a TLS-terminating proxy/load balancer or enable HTTPS at the host.' };
  });
}

export async function GET(req: NextRequest) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);

  const results = await Promise.all([
    checkMongo(),
    checkJwtSecret(),
    checkActiveEmailProvider(),
    checkFromEmail(),
    checkActiveAiProvider(),
    checkStripe(),
    checkCloudinary(),
    checkPaymentGateways(),
    checkSentry(),
    checkRedisQueue(),
    checkAppEnvironment(),
    checkSsl(req),
  ]);

  const summary = {
    ok: results.filter((r) => r.status === 'ok').length,
    warning: results.filter((r) => r.status === 'warning').length,
    error: results.filter((r) => r.status === 'error').length,
  };

  return sendResponse(true, 'Diagnostics complete', { results, summary, checkedAt: new Date().toISOString() });
}
