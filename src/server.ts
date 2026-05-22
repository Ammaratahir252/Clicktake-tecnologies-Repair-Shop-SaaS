// ============================================================
// DibnowRepairSaaS — Main Server Entry Point
// Merged: M12 (Security Base) + M5 (Billing, Payments & Finance)
// Start with: npm run dev
// Boots: DB connections → Security plugins → Routes → Listen
// ============================================================

import Fastify from 'fastify';
import * as Sentry from '@sentry/node';
import { env } from './config/env';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { connectPostgres } from './config/postgres';
import { connectRedis, redis } from './config/redis';
import { registerSecurityPlugins } from './middleware/securityMiddleware';
import { registerErrorHandler, registerProcessHandlers } from './middleware/errorHandler';
import { logger } from './utils/logger';

// ─── Initialize Sentry first (captures startup errors too) ───
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// ─── Create Fastify instance ──────────────────────────────────
const app = Fastify({
  logger: false, // We use Winston — disable Fastify's built-in pino logger
  trustProxy: true, // Required for correct IP behind Render.com/Cloudflare
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
});

// ─── Bootstrap ───────────────────────────────────────────────
const bootstrap = async (): Promise<void> => {
  try {
    // 1. Register process-level error handlers first
    registerProcessHandlers();

    // 2. Connect all databases — fail fast if any connection fails
    logger.info('Connecting to databases...');
    await Promise.all([
      connectMongoDB(),
      connectPostgres(),
      connectRedis(),
    ]);
    logger.info('All database connections established');

    // 3. Register security plugins (Helmet, CORS, rate limiting)
    await registerSecurityPlugins(app);
    logger.info('Security plugins registered');

    // 4. Register routes
    // ── Health check ──────────────────────────────────────────
    app.get('/health', async (request, reply) => {
      return reply.send({
        success: true,
        message: 'DibnowRepairSaaS is running',
        data: {
          status: 'healthy',
          version: '1.0.0',
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // ── M5 — Billing, Payments & Finance ──────────────────────
    const { billingRoutes } = await import('./modules/billing/routes/billing.routes');
    app.register(billingRoutes, { prefix: '/api/billing' });

    // ── Future modules — uncomment as each is built ───────────
    // M1 — Auth & User Management
    // const { authRoutes } = await import('./modules/auth/routes/auth.routes');
    // app.register(authRoutes, { prefix: '/api/auth' });

    // M2 — Ticket & Repair Management
    // const { ticketRoutes } = await import('./modules/tickets/routes/ticket.routes');
    // app.register(ticketRoutes, { prefix: '/api/tickets' });

    // M3 — Inventory & Parts Management
    // const { inventoryRoutes } = await import('./modules/inventory/routes/inventory.routes');
    // app.register(inventoryRoutes, { prefix: '/api/inventory' });

    // M4 — Customer Management
    // const { customerRoutes } = await import('./modules/customers/routes/customer.routes');
    // app.register(customerRoutes, { prefix: '/api/customers' });

    // M6 — Notifications
    // const { notificationRoutes } = await import('./modules/notifications/routes/notification.routes');
    // app.register(notificationRoutes, { prefix: '/api/notifications' });

    // M7 — Analytics & Reporting
    // const { analyticsRoutes } = await import('./modules/analytics/routes/analytics.routes');
    // app.register(analyticsRoutes, { prefix: '/api/analytics' });

    // 5. Register global error handler LAST
    registerErrorHandler(app);

    // 6. Start listening
    const port = parseInt(env.PORT);
    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`🚀 DibnowRepairSaaS running on port ${port}`);
    logger.info(`📍 Environment: ${env.NODE_ENV}`);

  } catch (error) {
    logger.error('❌ Server failed to start', { error });
    Sentry.captureException(error);
    process.exit(1);
  }
};

// ─── Graceful shutdown ────────────────────────────────────────
const shutdown = async (): Promise<void> => {
  logger.info('Graceful shutdown initiated');
  try {
    await app.close();
    await disconnectMongoDB();
    await redis.quit();
    logger.info('All connections closed — shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap();
