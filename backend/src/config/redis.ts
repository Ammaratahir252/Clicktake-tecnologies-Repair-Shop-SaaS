import Redis from 'ioredis';
import { logger } from '../utils/logger';

let _redis: Redis | null = null;

export const getRedis = (): Redis => {
  if (_redis) return _redis;
  _redis = new Redis({
    host:             process.env.REDIS_HOST     || 'localhost',
    port:             parseInt(process.env.REDIS_PORT || '6379', 10),
    password:         process.env.REDIS_PASSWORD || undefined,
    db:               parseInt(process.env.REDIS_DB   || '0', 10),
    retryStrategy:    (times) => Math.min(times * 200, 5000),
    lazyConnect:      true,
    enableReadyCheck: true,
  });
  _redis.on('connect', () => logger.info('Redis connected'));
  _redis.on('error',   (err) => logger.error('Redis error', { err: err.message }));
  return _redis;
};

// Named export matching what delivery.service.ts (v1) imports
export const redis = getRedis();

export const gpsKey          = (jobId: string) => `gps:job:${jobId}`;
export const GPS_TTL_SECONDS = 600;
