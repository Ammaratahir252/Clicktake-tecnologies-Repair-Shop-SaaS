import 'server-only';
import mongoose, { Schema, Model } from 'mongoose';
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
 * Application-level backup: dumps the core collections to a single JSON blob.
 * This is NOT a mongodump — it's plain documents, restored via
 * deleteMany+insertMany. Backups are stored IN MongoDB (a `platformbackups`
 * collection) rather than on local disk, so they survive serverless hosting
 * (Vercel wipes the filesystem between invocations) and redeploys. For
 * disaster recovery beyond the database itself, download a copy via
 * Settings → Backup & Recovery.
 */

// A single BSON document tops out at 16MB — refuse anything close to it so the
// insert can't fail halfway. If the platform outgrows this, backups need
// GridFS or object storage.
const MAX_BACKUP_BYTES = 14 * 1024 * 1024;

interface IPlatformBackup {
  filename: string;
  sizeBytes: number;
  content: string;
  createdAt: Date;
}

const backupSchema = new Schema<IPlatformBackup>(
  {
    filename: { type: String, required: true, unique: true },
    sizeBytes: { type: Number, required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const PlatformBackup: Model<IPlatformBackup> =
  mongoose.models.PlatformBackup || mongoose.model<IPlatformBackup>('PlatformBackup', backupSchema);

const COLLECTIONS: Record<string, any> = {
  tenants: Tenant,
  users: User,
  tickets: Ticket,
  customers: Customer,
  leads: Lead,
  subscriptions: Subscription,
  platformSettings: PlatformSettings,
};

export async function createBackup(): Promise<{ filename: string; sizeBytes: number }> {
  await connectDB();

  const dump: Record<string, any[]> = {};
  for (const [key, Model] of Object.entries(COLLECTIONS)) {
    dump[key] = await Model.find().lean();
  }

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const content = JSON.stringify({ createdAt: new Date().toISOString(), collections: dump }, null, 0);
  const sizeBytes = Buffer.byteLength(content, 'utf-8');

  if (sizeBytes > MAX_BACKUP_BYTES) {
    await SystemLog.create({ category: 'backup', message: `Backup skipped: dump is ${(sizeBytes / 1024 / 1024).toFixed(1)}MB, above the ${(MAX_BACKUP_BYTES / 1024 / 1024).toFixed(0)}MB single-document limit`, status: 'error' });
    throw new Error('Backup too large for database storage — export collections individually or configure external storage.');
  }

  await PlatformBackup.create({ filename, sizeBytes, content });
  await SystemLog.create({ category: 'backup', message: `Backup created: ${filename}`, status: 'ok', details: { sizeBytes } });

  return { filename, sizeBytes };
}

export async function listBackups(): Promise<{ filename: string; sizeBytes: number; createdAt: string }[]> {
  await connectDB();
  const rows = await PlatformBackup.find().select('filename sizeBytes createdAt').sort({ createdAt: -1 }).lean();
  return rows.map((r: any) => ({
    filename: r.filename,
    sizeBytes: r.sizeBytes,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export async function readBackupFile(filename: string): Promise<string> {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) throw new Error('Invalid backup filename');
  await connectDB();
  const row = await PlatformBackup.findOne({ filename }).select('content').lean() as any;
  if (!row) throw new Error('Backup not found');
  return row.content;
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
  await connectDB();
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const res = await PlatformBackup.deleteMany({ createdAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}
