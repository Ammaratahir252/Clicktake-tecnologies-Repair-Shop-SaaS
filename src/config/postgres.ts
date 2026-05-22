// ============================================================
// DibnowRepairSaaS — PostgreSQL (Supabase) Connection
// Financial DB: invoices, payments, estimates, audit_logs_immutable
// Uses pg Pool for connection reuse
// ============================================================

import { Pool, PoolClient } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: env.POSTGRES_URI,
  max: 20,                    // max connections in pool
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 5000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('PostgreSQL client connected from pool');
});

// ─── Run a query with auto-release ───────────────────────────
export const query = async <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow PostgreSQL query detected', { text, duration });
    }

    return result.rows as T[];
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('PostgreSQL query error', { text, error: err.message });
    throw error;
  }
};

// ─── Get a client for transactions ───────────────────────────
export const getClient = (): Promise<PoolClient> => pool.connect();

// ─── Run a transaction safely ─────────────────────────────────
// Automatically commits on success, rolls back on error
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ─── Health check ─────────────────────────────────────────────
export const checkPostgresHealth = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

export const connectPostgres = async (): Promise<void> => {
  try {
    await query('SELECT NOW()');
    logger.info('✅ PostgreSQL (Supabase) connected');
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed', { error });
    process.exit(1);
  }
};

export default pool;
