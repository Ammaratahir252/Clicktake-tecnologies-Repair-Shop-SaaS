// ============================================================
// DibnowRepairSaaS — Redis Connection
// Used for: sessions, rate limiting, stock locks, BullMQ queues
// Keys always prefixed: tenant:{id}:* for isolation
// ============================================================

import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// ─── Primary Redis client ─────────────────────────────────────
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis retry limit exceeded');
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

// ─── Key builders — consistent naming prevents collisions ─────
export const RedisKeys = {
  // Session blocklist (invalidated tokens)
  sessionBlocklist: (sessionId: string) => `blocklist:session:${sessionId}`,

  // Rate limiting
  rateLimit: (ip: string, route: string) => `ratelimit:${ip}:${route}`,
  loginAttempts: (email: string, tenantId: string) => `login_attempts:${tenantId}:${email}`,
  accountLockout: (email: string, tenantId: string) => `lockout:${tenantId}:${email}`,

  // Tenant config cache
  tenantConfig: (tenantId: string) => `tenant:${tenantId}:config`,

  // Stock locks — prevent double-booking last unit
  stockLock: (tenantId: string, partId: string) => `tenant:${tenantId}:stock_lock:${partId}`,

  // Password reset tokens
  passwordResetToken: (token: string) => `pwd_reset:${token}`,

  // Email verification tokens
  emailVerifyToken: (token: string) => `email_verify:${token}`,

  // Payment idempotency keys
  paymentIdempotency: (tenantId: string, key: string) => `tenant:${tenantId}:payment:idempotency:${key}`,

  // OTP codes
  otpCode: (tenantId: string, userId: string) => `tenant:${tenantId}:otp:${userId}`,
};

// ─── TTL Constants (seconds) ──────────────────────────────────
export const RedisTTL = {
  SESSION: 30 * 24 * 60 * 60,      // 30 days
  INACTIVITY: 30 * 60,              // 30 minutes
  RATE_LIMIT_WINDOW: 60,            // 1 minute
  LOGIN_ATTEMPTS: 15 * 60,          // 15 minutes lockout
  PASSWORD_RESET: 15 * 60,          // 15 minutes
  EMAIL_VERIFY: 15 * 60,            // 15 minutes
  TENANT_CONFIG_CACHE: 5 * 60,      // 5 minutes
  STOCK_LOCK: 30,                   // 30 seconds
  PAYMENT_IDEMPOTENCY: 24 * 60 * 60, // 24 hours
  OTP: 10 * 60,                     // 10 minutes
};

// ─── Session blocklist helpers ────────────────────────────────
export const blockSession = async (sessionId: string): Promise<void> => {
  await redis.setex(
    RedisKeys.sessionBlocklist(sessionId),
    RedisTTL.SESSION,
    '1'
  );
};

export const isSessionBlocked = async (sessionId: string): Promise<boolean> => {
  const result = await redis.exists(RedisKeys.sessionBlocklist(sessionId));
  return result === 1;
};

// ─── Login attempt tracking ───────────────────────────────────
export const incrementLoginAttempts = async (
  email: string,
  tenantId: string
): Promise<number> => {
  const key = RedisKeys.loginAttempts(email, tenantId);
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, RedisTTL.LOGIN_ATTEMPTS);
  }
  return attempts;
};

export const resetLoginAttempts = async (
  email: string,
  tenantId: string
): Promise<void> => {
  await redis.del(RedisKeys.loginAttempts(email, tenantId));
};

export const lockAccount = async (
  email: string,
  tenantId: string
): Promise<void> => {
  await redis.setex(
    RedisKeys.accountLockout(email, tenantId),
    RedisTTL.LOGIN_ATTEMPTS,
    '1'
  );
};

export const isAccountLocked = async (
  email: string,
  tenantId: string
): Promise<boolean> => {
  const result = await redis.exists(RedisKeys.accountLockout(email, tenantId));
  return result === 1;
};

export const connectRedis = async (): Promise<void> => {
  await redis.ping();
  logger.info('✅ Redis ping successful');
};
