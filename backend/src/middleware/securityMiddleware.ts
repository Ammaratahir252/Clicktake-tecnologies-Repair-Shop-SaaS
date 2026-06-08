// ============================================================
// DibnowRepairSaaS — API Security Middleware
// Helmet, CORS, rate limiting, brute-force protection
// Registered on Fastify app before all routes
// ============================================================

import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { redis, RedisKeys } from '../config/redis';
import { env } from '../config/env';
import { securityLogger } from '../utils/logger';

export const registerSecurityPlugins = async (app: FastifyInstance): Promise<void> => {

  // ── 1. Helmet — security headers ──────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,         // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,              // X-Content-Type-Options
    frameguard: { action: 'deny' }, // X-Frame-Options
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // ── 2. CORS — only allow whitelisted origins ───────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        // Allow server-to-server requests (no origin header)
        cb(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS: Origin not allowed'), false);
      }
    },
    credentials: true,          // allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'X-Request-Id',
      'X-Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,              // 24h preflight cache
  });

  // ── 3. Cookie parser ───────────────────────────────────────
  await app.register(cookie, {
    secret: env.JWT_SECRET, // signs cookies to prevent tampering
    hook: 'onRequest',
  });

  // ── 4. Global rate limiting ────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: parseInt(env.RATE_LIMIT_MAX),
    timeWindow: parseInt(env.RATE_LIMIT_WINDOW),
    redis,
    keyGenerator: (request) => {
      // Rate limit per IP + tenantId (if authenticated)
      const tenantId = request.headers['x-tenant-id'] || 'unknown';
      return `${request.ip}:${tenantId}`;
    },
    errorResponseBuilder: (request, context) => {
      securityLogger.rateLimitExceeded(request.ip, request.url);
      return {
        success: false,
        message: `Too many requests. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
      };
    },
  });

  // ── 5. Multipart for file uploads ─────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,  // 10MB max file size
      files: 5,                     // max 5 files per request
      fields: 10,                   // max 10 non-file fields
    },
  });

  // ── 6. Request ID — trace requests across services ────────
  app.addHook('onRequest', async (request) => {
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    request.headers['x-request-id'] = requestId;
  });
};

// ─── Stricter rate limit for auth endpoints ───────────────────
// Apply specifically to /api/auth/* routes
export const authRateLimitOptions = {
  max: 10,
  timeWindow: '15 minutes',
  errorResponseBuilder: () => ({
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  }),
};

// ─── Payment endpoint rate limit ─────────────────────────────
export const paymentRateLimitOptions = {
  max: 20,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    success: false,
    message: 'Too many payment requests. Please slow down.',
  }),
};

// ─── Brute-force login protection ────────────────────────────
// Single source of truth lives in config/redis.ts — re-exported here for convenience
export {
  incrementLoginAttempts as recordFailedAttempt,
  resetLoginAttempts as clearLoginAttempts,
  lockAccount,
  isAccountLocked,
} from '../config/redis';
