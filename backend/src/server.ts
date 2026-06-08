import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { getRedis } from './config/redis';
import { registerErrorHandler } from './middleware/errorHandler';
import { deliveryRoutes } from './modules/delivery/routes/delivery.routes';
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
    rep.send({ success: true, data: { status: 'healthy', module: 'M9 Doorstep Delivery', timestamp: new Date().toISOString() } })
  );

  // Module 9 routes
  app.register(deliveryRoutes, { prefix: '/api/delivery' });

  // Error handler (must be last)
  registerErrorHandler(app);

  const port = parseInt(process.env.PORT || '4001', 10);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info(`🚀 DibnowRepairSaaS M9 running on port ${port}`);
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
