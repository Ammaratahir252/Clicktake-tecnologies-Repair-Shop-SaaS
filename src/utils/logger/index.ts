// ============================================================
// DibnowRepairSaaS — Structured Logger
// Logs: auth failures, payment events, errors, audit events
// Never log raw passwords, card data, or secrets
// ============================================================

import winston from 'winston';
import { env, isProduction } from '../../config/env';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// ─── Dev format: readable colored output ─────────────────────
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

// ─── Prod format: JSON for log aggregators (Datadog, Logtail) ─
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'dibnow-backend', env: env.NODE_ENV },
  transports: [
    new winston.transports.Console(),
    // Production: add file transport or external log service
    ...(isProduction
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

// ─── Specialized log helpers ─────────────────────────────────

export const authLogger = {
  loginSuccess: (userId: string, tenantId: string, ip: string) =>
    logger.info('AUTH_LOGIN_SUCCESS', { userId, tenantId, ip }),

  loginFailed: (email: string, tenantId: string, ip: string, reason: string) =>
    logger.warn('AUTH_LOGIN_FAILED', { email, tenantId, ip, reason }),

  accountLocked: (userId: string, tenantId: string, ip: string) =>
    logger.warn('AUTH_ACCOUNT_LOCKED', { userId, tenantId, ip }),

  suspiciousLogin: (userId: string, tenantId: string, ip: string, reason: string) =>
    logger.warn('AUTH_SUSPICIOUS_LOGIN', { userId, tenantId, ip, reason }),

  sessionInvalidated: (userId: string, tenantId: string, sessionId: string) =>
    logger.info('AUTH_SESSION_INVALIDATED', { userId, tenantId, sessionId }),

  passwordReset: (userId: string, tenantId: string, ip: string) =>
    logger.info('AUTH_PASSWORD_RESET', { userId, tenantId, ip }),
};

export const paymentLogger = {
  created: (invoiceId: string, tenantId: string, gateway: string, amount: number) =>
    logger.info('PAYMENT_CREATED', { invoiceId, tenantId, gateway, amount }),

  success: (paymentId: string, tenantId: string, gateway: string, amount: number) =>
    logger.info('PAYMENT_SUCCESS', { paymentId, tenantId, gateway, amount }),

  failed: (invoiceId: string, tenantId: string, gateway: string, errorCode: string) =>
    logger.error('PAYMENT_FAILED', { invoiceId, tenantId, gateway, errorCode }),

  refunded: (paymentId: string, tenantId: string, amount: number) =>
    logger.info('PAYMENT_REFUNDED', { paymentId, tenantId, amount }),

  webhookReceived: (gateway: string, eventType: string, tenantId?: string) =>
    logger.info('WEBHOOK_RECEIVED', { gateway, eventType, tenantId }),

  webhookVerificationFailed: (gateway: string, ip: string) =>
    logger.warn('WEBHOOK_VERIFICATION_FAILED', { gateway, ip }),
};

export const securityLogger = {
  crossTenantAttempt: (userId: string, requestedTenantId: string, userTenantId: string, ip: string) =>
    logger.error('SECURITY_CROSS_TENANT_ATTEMPT', { userId, requestedTenantId, userTenantId, ip }),

  rateLimitExceeded: (ip: string, route: string, tenantId?: string) =>
    logger.warn('SECURITY_RATE_LIMIT', { ip, route, tenantId }),

  invalidToken: (ip: string, route: string) =>
    logger.warn('SECURITY_INVALID_TOKEN', { ip, route }),

  forbiddenAccess: (userId: string, role: string, resource: string, action: string) =>
    logger.warn('SECURITY_FORBIDDEN_ACCESS', { userId, role, resource, action }),

  fileUploadRejected: (reason: string, tenantId: string, mimeType: string) =>
    logger.warn('SECURITY_FILE_UPLOAD_REJECTED', { reason, tenantId, mimeType }),

  suspiciousPayload: (ip: string, route: string, reason: string) =>
    logger.warn('SECURITY_SUSPICIOUS_PAYLOAD', { ip, route, reason }),

  accountLocked: (identifier: string, tenantId: string, ip: string) =>
    logger.warn('SECURITY_ACCOUNT_LOCKED', { identifier, tenantId, ip }),
};

export const auditLogger = {
  log: (
    action: string,
    userId: string,
    tenantId: string,
    entityType: string,
    entityId: string,
    changes?: object
  ) =>
    logger.info('AUDIT', {
      action,
      userId,
      tenantId,
      entityType,
      entityId,
      changes,
      timestamp: new Date().toISOString(),
    }),
};
