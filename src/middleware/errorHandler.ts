// ============================================================
// DibnowRepairSaaS — Global Error Handler
// Catches ALL errors from routes — never crashes the server
// Returns standardized ApiResponse for every error type
// ============================================================

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import * as Sentry from '@sentry/node';
import { AppError, ValidationError as AppValidationError } from '../errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ZodError } from 'zod';

export const registerErrorHandler = (app: FastifyInstance): void => {

  // ── Global error handler ───────────────────────────────────
  app.setErrorHandler(async (
    error: FastifyError | AppError | ZodError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const requestId = request.headers['x-request-id'] as string;
    const ip = request.ip;

    // ── Zod validation error ───────────────────────────────
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      error.errors.forEach((e) => {
        fields[e.path.join('.')] = e.message;
      });

      return reply.status(400).send({
        success: false,
        message: 'Validation failed',
        errors: Object.entries(fields).map(([field, message]) => ({
          field,
          message,
        })),
      });
    }

    // ── Our custom AppError subclasses ─────────────────────
    if (error instanceof AppError) {
      // Log operational errors at warn level (expected)
      if (error.isOperational) {
        logger.warn('Operational error', {
          message: error.message,
          statusCode: error.statusCode,
          url: request.url,
          method: request.method,
          requestId,
          ip,
        });
      } else {
        // Non-operational = bug — log at error level + Sentry
        logger.error('Non-operational error', {
          message: error.message,
          stack: error.stack,
          url: request.url,
          requestId,
          ip,
        });
        Sentry.captureException(error, {
          extra: { url: request.url, method: request.method, requestId },
        });
      }

      const response: Record<string, unknown> = {
        success: false,
        message: error.message,
      };

      // Include field errors for ValidationError
      if (error instanceof AppValidationError && error.fields) {
        response.errors = Object.entries(error.fields).map(([field, message]) => ({
          field,
          message,
        }));
      }

      return reply.status(error.statusCode).send(response);
    }

    // ── Fastify built-in errors (e.g., route not found) ───
    if ('statusCode' in error && error.statusCode) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
      });
    }

    // ── Unknown/unexpected error ───────────────────────────
    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      requestId,
      ip,
    });

    Sentry.captureException(error);

    // Never expose internal error details to client in production
    return reply.status(500).send({
      success: false,
      message: env.NODE_ENV === 'production'
        ? 'An internal server error occurred'
        : error.message,
    });
  });

  // ── 404 handler ────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
};

// ─── Process-level error handlers ────────────────────────────
// Prevents the entire Node process from crashing
export const registerProcessHandlers = (): void => {
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION — shutting down', {
      message: error.message,
      stack: error.stack,
    });
    Sentry.captureException(error);
    // Give Sentry time to flush, then exit
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('UNHANDLED REJECTION', { reason });
    Sentry.captureException(reason);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received — graceful shutdown starting');
    // Connections are closed in server.ts shutdown handler
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received — graceful shutdown starting');
    process.exit(0);
  });
};
