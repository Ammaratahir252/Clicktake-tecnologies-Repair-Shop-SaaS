import 'server-only';
import os from 'os';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import Tenant from '@/models/tenant.model';
import Subscription from '@/models/subscription.model';
import SystemLog from '@/models/systemLog.model';
import { notifySuperAdmins } from '@/lib/notifications';
import { createBackup, purgeOldBackups } from '@/lib/backup';
import { getStorageUsageByTenant } from '@/lib/storageUsage';

const TICK_MS = 15 * 60 * 1000; // 15 minutes

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

async function sampleResources(): Promise<void> {
  await connectDB();
  const settings = await PlatformSettings.findOne().select('notifs').lean() as any;
  if (!settings) return;

  const cpuCount = os.cpus().length || 1;
  const load1 = os.loadavg()[0];
  const cpuPct = (load1 / cpuCount) * 100;
  const memPct = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

  if (cpuPct > 90 && settings.notifs?.highCpuUsage) {
    void notifySuperAdmins('High CPU Usage Alert', `<p>1-minute load average is ${load1.toFixed(2)} across ${cpuCount} core(s) (~${cpuPct.toFixed(0)}%).</p>`);
    await SystemLog.create({ category: 'monitor', message: `High CPU usage: ${cpuPct.toFixed(0)}%`, status: 'warning' });
  }
  if (memPct > 90 && settings.notifs?.highMemoryUsage) {
    void notifySuperAdmins('High Memory Usage Alert', `<p>Memory usage is at ${memPct.toFixed(0)}% of total system memory.</p>`);
    await SystemLog.create({ category: 'monitor', message: `High memory usage: ${memPct.toFixed(0)}%`, status: 'warning' });
  }
}

async function runAutoBackup(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('autoBackupEnabled autoBackupFrequency backupRetentionDays lastAutoBackupAt notifs').lean() as any;
  if (!settings?.autoBackupEnabled) return;

  const intervalMs = FREQUENCY_MS[settings.autoBackupFrequency] ?? FREQUENCY_MS.daily;
  const last = settings.lastAutoBackupAt ? new Date(settings.lastAutoBackupAt).getTime() : 0;
  if (Date.now() - last < intervalMs) return;

  try {
    await createBackup();
    await PlatformSettings.findOneAndUpdate({}, { $set: { lastAutoBackupAt: new Date() } });
    const removed = await purgeOldBackups(settings.backupRetentionDays);
    if (removed > 0) await SystemLog.create({ category: 'backup', message: `Pruned ${removed} backup(s) past retention window`, status: 'ok' });
  } catch (err: any) {
    await SystemLog.create({ category: 'backup', message: 'Automatic backup failed', status: 'error', details: { error: err.message } });
    if (settings.notifs?.databaseBackupFailed) {
      void notifySuperAdmins('Automatic Backup Failed', `<p>The scheduled platform backup failed: ${err.message}</p>`);
    }
  }
}

async function runAutoSuspend(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('autoSuspendExpiredShops gracePeriodDays notifs').lean() as any;
  if (!settings?.autoSuspendExpiredShops) return;

  const cutoff = new Date(Date.now() - (settings.gracePeriodDays ?? 3) * 86_400_000);
  const overdue = await Subscription.find({
    status: 'active',
    nextBillingDate: { $ne: null, $lt: cutoff },
  }).select('tenantId').lean();

  if (overdue.length === 0) return;

  const tenantIds = overdue.map((s: any) => s.tenantId);
  await Subscription.updateMany({ tenantId: { $in: tenantIds } }, { $set: { status: 'suspended' } });
  await Tenant.updateMany({ _id: { $in: tenantIds } }, { $set: { isActive: false } });
  await SystemLog.create({ category: 'monitor', message: `Auto-suspended ${tenantIds.length} tenant(s) past grace period`, status: 'warning' });
}

async function runStorageCheck(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('maxStoragePerTenantMb notifs').lean() as any;
  if (!settings?.maxStoragePerTenantMb || !settings.notifs?.storageLimitReached) return;

  const usages = await getStorageUsageByTenant(settings.maxStoragePerTenantMb);
  const over = usages.filter((u) => u.overCap);
  if (over.length === 0) return;

  void notifySuperAdmins(
    'Storage Limit Reached',
    `<p>${over.length} tenant(s) are over their ${settings.maxStoragePerTenantMb}MB storage cap:</p><ul>${over.map((u) => `<li>${u.tenantName}: ${u.usedMb.toFixed(1)}MB</li>`).join('')}</ul>`
  );
  await SystemLog.create({ category: 'monitor', message: `${over.length} tenant(s) over their storage cap`, status: 'warning', details: { tenants: over.map((u) => u.tenantName) } });
}

let lastDailyRunDate = '';

async function tick(): Promise<void> {
  try {
    await connectDB();
    await sampleResources();

    const today = new Date().toISOString().slice(0, 10);
    if (today !== lastDailyRunDate) {
      lastDailyRunDate = today;
      await Promise.allSettled([runAutoBackup(), runAutoSuspend(), runStorageCheck()]);
    }
  } catch {
    // scheduler must never crash the process
  }
}

/** Starts the in-process scheduler exactly once per running server, guarded against
 * Next.js dev-mode hot-reload re-imports via a global flag (same pattern as lib/db.ts). */
export function startScheduler(): void {
  const g = global as any;
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  setInterval(() => void tick(), TICK_MS);
  void tick(); // run once shortly after boot rather than waiting a full interval
}
