/**
 * Standalone diagnostic for the M7 email fallback chain (Resend → MailerSend → Mailtrap)
 * plus a quick core-infra connectivity check.
 *
 * Run with: npx ts-node --transpile-only scripts/emailDiagnostic.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

import mongoose from 'mongoose';
import Redis from 'ioredis';
import { ResendEmailAdapter } from '../src/modules/notifications/providers/email/resend.adapter';
import { MailerSendAdapter } from '../src/modules/notifications/providers/email/mailersend.adapter';
import { MailtrapAdapter } from '../src/modules/notifications/providers/email/mailtrap.adapter';

const TEST_RECIPIENT = 'nowdib@gmail.com';

type Row = { name: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string };
const rows: Row[] = [];
const log = (r: Row) => { rows.push(r); console.log(`[${r.status}] ${r.name} — ${r.detail}`); };

async function checkEnvVars() {
  const required = [
    'RESEND_API_KEY', 'MAILERSEND_API_KEY', 'MAILTRAP_API_KEY',
    'MONGODB_URI', 'REDIS_URL', 'ENCRYPTION_KEY', 'JWT_SECRET',
  ];
  for (const key of required) {
    const present = !!process.env[key];
    log({ name: `env:${key}`, status: present ? 'PASS' : 'FAIL', detail: present ? 'set' : 'missing' });
  }
}

async function checkMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { log({ name: 'MongoDB connectivity', status: 'SKIP', detail: 'MONGODB_URI not set' }); return; }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    log({ name: 'MongoDB connectivity', status: 'PASS', detail: 'connected' });
    await mongoose.disconnect();
  } catch (err) {
    log({ name: 'MongoDB connectivity', status: 'FAIL', detail: err instanceof Error ? err.message : String(err) });
  }
}

async function checkRedis() {
  // Mirrors how the app actually connects (REDIS_HOST/PORT/PASSWORD/DB), NOT the REDIS_URL var,
  // to surface the real runtime behavior rather than what the .env file implies.
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    lazyConnect: true,
    connectTimeout: 8000,
    retryStrategy: () => null, // don't retry — we want a fast fail for diagnostics
  });
  try {
    await redis.connect();
    await redis.ping();
    log({ name: 'Redis connectivity (via REDIS_HOST/PORT)', status: 'PASS', detail: 'connected' });
  } catch (err) {
    log({
      name: 'Redis connectivity (via REDIS_HOST/PORT)',
      status: 'FAIL',
      detail: `${err instanceof Error ? err.message : String(err)} — note: app code reads REDIS_HOST/REDIS_PORT/REDIS_PASSWORD, but .env only defines REDIS_URL`,
    });
  } finally {
    redis.disconnect();
  }
}

async function checkEmailProvider(name: string, adapter: { send: (p: any) => Promise<any> }, apiKeyEnv: string) {
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) { log({ name: `Email: ${name}`, status: 'SKIP', detail: `${apiKeyEnv} not set` }); return; }

  const result = await adapter.send({
    to: TEST_RECIPIENT,
    subject: `[Diagnostic] ${name} test — Dibnow`,
    title: `${name} diagnostic`,
    body: `<p>This is an automated diagnostic email sent via <strong>${name}</strong> to verify the email integration works.</p>`,
    tenantId: 'diagnostic',
    notificationId: `diagnostic-${name.toLowerCase()}-${Date.now()}`,
    apiKey,
  });

  const sandboxNote = name === 'Mailtrap' && process.env.MAILTRAP_INBOX_ID
    ? ' [SANDBOX MODE — captured in Mailtrap inbox UI, NOT delivered to real recipient]'
    : '';

  log({
    name: `Email: ${name}`,
    status: result.success ? 'PASS' : 'FAIL',
    detail: (result.success ? `sent (ref: ${result.providerReference ?? 'n/a'})` : result.error) + sandboxNote,
  });
}

async function main() {
  console.log(`\n=== Dibnow Systems Diagnostic — ${new Date().toISOString()} ===\n`);

  console.log('--- Environment variables ---');
  await checkEnvVars();

  console.log('\n--- Core infrastructure ---');
  await checkMongo();
  await checkRedis();

  console.log('\n--- Email providers (live send test to ' + TEST_RECIPIENT + ') ---');
  await checkEmailProvider('Resend', new ResendEmailAdapter(), 'RESEND_API_KEY');
  await checkEmailProvider('MailerSend', new MailerSendAdapter(), 'MAILERSEND_API_KEY');
  await checkEmailProvider('Mailtrap', new MailtrapAdapter(), 'MAILTRAP_API_KEY');

  const passed = rows.filter((r) => r.status === 'PASS').length;
  const failed = rows.filter((r) => r.status === 'FAIL').length;
  const skipped = rows.filter((r) => r.status === 'SKIP').length;

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${skipped} skipped ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Diagnostic crashed:', err);
  process.exit(1);
});
