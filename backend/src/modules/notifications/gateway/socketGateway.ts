import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import { logger } from '../../../utils/logger';

let _io: Server | null = null;

export const initSocketGateway = (httpServer: HttpServer): Server => {
  const pubClient = new IORedis({
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db:       parseInt(process.env.REDIS_DB || '0', 10),
    lazyConnect: true,
  });
  const subClient = pubClient.duplicate();

  _io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  _io.adapter(createAdapter(pubClient, subClient));

  _io.on('connection', (socket) => {
    const { tenantId, userId, customerId } = socket.handshake.auth as {
      tenantId?: string;
      userId?: string;
      customerId?: string;
    };

    if (!tenantId) {
      socket.disconnect(true);
      return;
    }

    if (userId)     socket.join(`tenant:${tenantId}:user:${userId}`);
    if (customerId) socket.join(`tenant:${tenantId}:customer:${customerId}`);

    logger.info('Socket connected', { tenantId, userId, customerId, socketId: socket.id });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { socketId: socket.id });
    });
  });

  logger.info('Socket.io gateway initialized');
  return _io;
};

export const emitToUser = (
  tenantId: string,
  userId: string,
  data: Record<string, unknown>
): void => {
  _io?.to(`tenant:${tenantId}:user:${userId}`).emit('notification', data);
};

export const emitToCustomer = (
  tenantId: string,
  customerId: string,
  data: Record<string, unknown>
): void => {
  _io?.to(`tenant:${tenantId}:customer:${customerId}`).emit('notification', data);
};
