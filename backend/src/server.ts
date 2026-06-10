import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { getRedis } from './config/redis';
import { registerErrorHandler } from './middleware/errorHandler';
import { deliveryRoutes } from './modules/delivery/routes/delivery.routes';
import { notificationRoutes } from './modules/notifications/routes/notification.routes';
import { startNotificationService } from './modules/notifications/service/notification.service';
import { startNotificationWorker } from './modules/notifications/queue/notificationWorker';
import { initSocketGateway } from './modules/notifications/gateway/socketGateway';
import { seedDefaultTemplates } from './modules/notifications/templates/defaultTemplates';
import { logger } from './utils/logger';

const app = Fastify({ logger: false, trustProxy: true });

const bootstrap = async (): Promise<void> => {
  // CORS
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Connect MongoDB
  await connectMongoDB();

  // Pre-connect Redis (lazy — won't block startup)
  getRedis();

  // Health check
  app.get('/health', async (_req, rep) =>
    rep.send({
      success: true,
      data: {
        status:    'healthy',
        modules:   ['M7 Notifications', 'M9 Doorstep Delivery'],
        timestamp: new Date().toISOString(),
      },
    })
  );

  // Module routes
  app.register(deliveryRoutes,     { prefix: '/api/delivery' });
  app.register(notificationRoutes, { prefix: '/api' });

  // Error handler (must be last Fastify plugin)
  registerErrorHandler(app);

  const port = parseInt(process.env.PORT || '4001', 10);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`DibnowRepairSaaS running on port ${port}`);

  // Socket.io — must be after app.listen so httpServer is bound
  initSocketGateway(app.server);

  // Seed default notification templates (idempotent)
  await seedDefaultTemplates();

  // Start M7 event listener + BullMQ worker
  startNotificationService();
  startNotificationWorker();

  logger.info('M7 Notifications & Communications ready');
};

const shutdown = async () => {
  await app.close();
  await disconnectMongoDB();
  logger.info('Server shut down cleanly');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((err) => {
  logger.error('Startup failed', { error: err.message });
  process.exit(1);
});
