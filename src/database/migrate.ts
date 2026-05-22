// ============================================================
// DibnowRepairSaaS — PostgreSQL Migration Runner
// Run with: npx ts-node src/database/migrate.ts
// Runs all migrations in order, skips already-run ones
// ============================================================

import fs from 'fs';
import path from 'path';
import { query, getClient } from '../config/postgres';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ─── Create migrations tracking table if not exists ──────────
const createMigrationsTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id            SERIAL PRIMARY KEY,
      filename      VARCHAR(255) UNIQUE NOT NULL,
      executed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

// ─── Get already-run migrations ───────────────────────────────
const getExecutedMigrations = async (): Promise<string[]> => {
  const rows = await query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id ASC'
  );
  return rows.map((r) => r.filename);
};

// ─── Run a single migration file ─────────────────────────────
const runMigration = async (filename: string): Promise<void> => {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    logger.info(`✅ Migration executed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`❌ Migration failed: ${filename}`, { error });
    throw error;
  } finally {
    client.release();
  }
};

// ─── Main migration runner ────────────────────────────────────
const migrate = async (): Promise<void> => {
  logger.info('Starting database migrations...');

  await createMigrationsTable();

  const executed = await getExecutedMigrations();

  // Get all .sql files, sorted by name (001_, 002_, 003_...)
  const allMigrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = allMigrations.filter((f) => !executed.includes(f));

  if (pending.length === 0) {
    logger.info('✅ All migrations already up to date');
    process.exit(0);
  }

  logger.info(`Found ${pending.length} pending migration(s)`);

  for (const migration of pending) {
    await runMigration(migration);
  }

  logger.info(`✅ All migrations completed successfully`);
  process.exit(0);
};

migrate().catch((error) => {
  logger.error('Migration runner failed', { error });
  process.exit(1);
});
