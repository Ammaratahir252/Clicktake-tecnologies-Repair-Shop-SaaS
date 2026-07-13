import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/db';
import Tenant from '@/models/tenant.model';
import User from '@/models/user.model';
import Ticket from '@/models/ticket.model';
import Customer from '@/models/customer.model';
import Lead from '@/models/lead.model';
import Subscription from '@/models/subscription.model';
import PlatformSettings from '@/models/platformSettings.model';
import SystemLog from '@/models/systemLog.model';

/**
 * Application-level backup: dumps the core collections to a single JSON file
 * on local disk. This is NOT a mongodump — it's plain documents, restored via
 * deleteMany+insertMany. Good enough for self-hosted recovery; it requires a
 * persistent filesystem (works under `next start` / `next dev` on a real
 * server or this machine — will NOT survive on ephemeral/serverless hosting
 * like Vercel, since the filesystem there is wiped between invocations).
 */
const BACKUP_DIR = path.join(process.cwd(), 'backups');

const COLLECTIONS: Record<string, any> = {
  tenants: Tenant,
  users: User,
  tickets: Ticket,
  customers: Customer,
  leads: Lead,
  subscriptions: Subscription,
  platformSettings: PlatformSettings,
};

async function ensureDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

export async function createBackup(): Promise<{ filename: string; sizeBytes: number }> {
  await connectDB();
  await ensureDir();

  const dump: Record<string, any[]> = {};
  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    dump[key] = await Model.find().lean();
  }

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  const content = JSON.stringify({ createdAt: new Date().toISOString(), collections: dump }, null, 0);
  await fs.writeFile(filePath, content, 'utf-8');

  const stat = await fs.stat(filePath);
  await SystemLog.create({ category: 'backup', message: `Backup created: ${filename}`, status: 'ok', details: { sizeBytes: stat.size } });

  return { filename, sizeBytes: stat.size };
}

export async function listBackups(): Promise<{ filename: string; sizeBytes: number; createdAt: string }[]> {
  await ensureDir();
  const files = await fs.readdir(BACKUP_DIR);
  const results = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map(async (f) => {
      const stat = await fs.stat(path.join(BACKUP_DIR, f));
      return { filename: f, sizeBytes: stat.size, createdAt: stat.birthtime.toISOString() };
    })
  );
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readBackupFile(filename: string): Promise<string> {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) throw new Error('Invalid backup filename');
  return fs.readFile(path.join(BACKUP_DIR, filename), 'utf-8');
}

export async function restoreBackup(filename: string): Promise<Record<string, number>> {
  await connectDB();
  const raw = await readBackupFile(filename);
  const parsed = JSON.parse(raw);
  const counts: Record<string, number> = {};

  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    const docs = parsed.collections?.[key];
    if (!Array.isArray(docs)) continue;
    await Model.deleteMany({});
    if (docs.length > 0) await Model.insertMany(docs, { ordered: false }).catch(() => {});
    counts[key] = docs.length;
  }

  await SystemLog.create({ category: 'backup', message: `Restored from ${filename}`, status: 'warning', details: counts });
  return counts;
}

export async function purgeOldBackups(retentionDays: number): Promise<number> {
  if (!retentionDays || retentionDays <= 0) return 0;
  await ensureDir();
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const files = await fs.readdir(BACKUP_DIR);
  let removed = 0;
  for (const f of files) {
    const filePath = path.join(BACKUP_DIR, f);
    const stat = await fs.stat(filePath);
    if (stat.birthtimeMs < cutoff) {
      await fs.unlink(filePath);
      removed++;
    }
  }
  return removed;
}
