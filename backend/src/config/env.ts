// ============================================================
// DibnowRepairSaaS — Environment Configuration
// Validates all required env vars on startup — fail fast
// ============================================================

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('4000'),
  APP_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  JWT_REFRESH_SECRET: z.string().min(32),

  // MongoDB Atlas
  MONGODB_URI: z.string().url(),

  // PostgreSQL (Supabase) — Financial data
  POSTGRES_URI: z.string(),

  // Redis
  REDIS_URL: z.string(),

  // Encryption — AES-256 requires 32-byte key
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be 32 characters for AES-256'),
  ENCRYPTION_IV: z.string().min(16, 'ENCRYPTION_IV must be 16 characters'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // PayPal
  PAYPAL_CLIENT_ID: z.string(),
  PAYPAL_CLIENT_SECRET: z.string(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

  // JazzCash
  JAZZCASH_MERCHANT_ID: z.string().optional(),
  JAZZCASH_PASSWORD: z.string().optional(),
  JAZZCASH_INTEGRITY_SALT: z.string().optional(),

  // EasyPaisa
  EASYPAISA_STORE_ID: z.string().optional(),
  EASYPAISA_HASH_KEY: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),

  // Email (Resend)
  RESEND_API_KEY: z.string().startsWith('re_'),

  // Twilio SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Notifications
  NOTIFICATION_FROM_EMAIL: z.string().email().optional().or(z.literal('')),
  NOTIFICATION_FROM_NAME: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('60000'), // 1 minute in ms

  // Session
  SESSION_INACTIVITY_TIMEOUT: z.string().default('1800'), // 30 min in seconds
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1); // Fail fast — never start with bad config
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
