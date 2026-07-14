import 'server-only';
import os from 'os';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import Tenant from '@/models/tenant.model';
import Subscription from '@/models/subscription.model';
import SystemLog from '@/models/systemLog.model';
import Ticket from '@/models/ticket.model';
import Payment from '@/models/payment.model';
import User from '@/models/user.model';
import { notifySuperAdmins, notifyTenantByRole, sendEmail } from '@/lib/notifications';
import { createBackup, purgeOldBackups } from '@/lib/backup';
import { getStorageUsageByTenant } from '@/lib/storageUsage';
import { getPlatformLocale, formatPlatformDate, formatPlatformDateTime } from '@/lib/locale';
import { TicketStatus } from '@/lib/enums';

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

/** "Subscription Expiring" alerts — bills due within 7 days. Alerted at most once
 * per week per subscription (lastExpiryAlertAt), emails the shop owner and the
 * super admins. Gated by Settings → Notifications → Subscription Expiring. */
async function runSubscriptionExpiryAlerts(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('notifs').lean() as any;
  if (settings?.notifs?.subscriptionExpiring === false) return;

  const now = Date.now();
  const soon = new Date(now + 7 * 86_400_000);
  const weekAgo = new Date(now - 7 * 86_400_000);
  const expiring = await Subscription.find({
    status: { $in: ['active', 'trial'] },
    nextBillingDate: { $ne: null, $gt: new Date(now), $lte: soon },
    $or: [{ lastExpiryAlertAt: null }, { lastExpiryAlertAt: { $lte: weekAgo } }],
  }).lean() as any[];
  if (!expiring.length) return;

  const locale = await getPlatformLocale();
  const lines: string[] = [];
  for (const sub of expiring) {
    const [tenant, owner] = await Promise.all([
      Tenant.findById(sub.tenantId).select('name').lean() as Promise<any>,
      User.findOne({ tenantId: sub.tenantId, role: 'owner', isActive: true }).select('name email').lean() as Promise<any>,
    ]);
    const dueText = formatPlatformDate(sub.nextBillingDate, locale);
    lines.push(`<li><strong>${tenant?.name || sub.tenantId}</strong> — ${sub.plan} plan, due ${dueText}</li>`);
    if (owner?.email) {
      void sendEmail(
        owner.email,
        'Your subscription renews soon',
        `<p>Hi ${owner.name || 'there'},</p><p>Your <strong>${sub.plan}</strong> subscription for <strong>${tenant?.name || 'your shop'}</strong> is due for renewal on <strong>${dueText}</strong> (${sub.currency} ${Number(sub.amount || 0).toLocaleString()}).</p><p>Please make sure your payment goes through to avoid interruption.</p>`
      );
    }
    await Subscription.updateOne({ _id: sub._id }, { $set: { lastExpiryAlertAt: new Date() } });
  }

  void notifySuperAdmins(
    'Subscriptions Expiring Within 7 Days',
    `<p>${expiring.length} subscription(s) are due for renewal in the next 7 days:</p><ul>${lines.join('')}</ul>`
  );
}

/** Stuck-ticket escalation — open tickets untouched for 7+ days get escalated once:
 * the tenant's owner/manager get an in-app alert, and super admins get a summary.
 * Gated by Settings → Notifications → Ticket Escalation. */
async function runTicketEscalations(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('notifs').lean() as any;
  if (settings?.notifs?.ticketEscalation === false) return;

  const cutoff = new Date(Date.now() - 7 * 86_400_000);
  const stuck = await Ticket.find({
    status: { $nin: [TicketStatus.delivered, TicketStatus.cancelled] },
    updatedAt: { $lt: cutoff },
    escalationAlertedAt: null,
  }).select('tenantId ticketNumber status deviceBrand deviceModel updatedAt').limit(50).lean() as any[];
  if (!stuck.length) return;

  const locale = await getPlatformLocale();
  const byTenant = new Map<string, any[]>();
  for (const t of stuck) {
    const key = String(t.tenantId);
    byTenant.set(key, [...(byTenant.get(key) ?? []), t]);
  }

  const summaryLines: string[] = [];
  for (const [tenantId, tickets] of Array.from(byTenant.entries())) {
    const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
    for (const t of tickets) {
      void notifyTenantByRole(
        tenantId, ['owner', 'manager'], 'ticket_escalation',
        `Ticket ${t.ticketNumber} needs attention`,
        `${t.deviceBrand} ${t.deviceModel} has been stuck in "${t.status}" since ${formatPlatformDate(t.updatedAt, locale)}.`,
        { ticketNumber: t.ticketNumber }
      );
      summaryLines.push(`<li><strong>${t.ticketNumber}</strong> (${tenant?.name || tenantId}) — "${t.status}" since ${formatPlatformDate(t.updatedAt, locale)}</li>`);
    }
  }
  await Ticket.updateMany({ _id: { $in: stuck.map((t) => t._id) } }, { $set: { escalationAlertedAt: new Date() } });

  void notifySuperAdmins(
    `${stuck.length} Ticket(s) Escalated — Stuck 7+ Days`,
    `<p>These tickets have had no activity for over a week; the shop owners/managers were alerted in-app:</p><ul>${summaryLines.join('')}</ul>`
  );
  await SystemLog.create({ category: 'monitor', message: `Escalated ${stuck.length} stuck ticket(s)`, status: 'warning' });
}

/** Daily platform report emailed to super admins — last-24h signups, tickets,
 * payments, and platform totals. Gated by Settings → Notifications → Daily Report. */
async function runDailyReport(): Promise<void> {
  const settings = await PlatformSettings.findOne().select('notifs').lean() as any;
  if (!settings?.notifs?.dailyReport) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [newTenants, newTickets, deliveredTickets, payments, totalTenants, activeTenants] = await Promise.all([
    Tenant.countDocuments({ createdAt: { $gte: since } }),
    Ticket.countDocuments({ createdAt: { $gte: since } }),
    Ticket.countDocuments({ status: TicketStatus.delivered, updatedAt: { $gte: since } }),
    Payment.find({ createdAt: { $gte: since } }).select('status amount currency').lean() as Promise<any[]>,
    Tenant.countDocuments({}),
    Tenant.countDocuments({ isActive: true }),
  ]);

  const completed = payments.filter((p) => p.status === 'completed');
  const failed = payments.filter((p) => p.status === 'failed');
  const revenue = completed.reduce((sum, p) => sum + (p.amount || 0), 0);
  const currency = completed[0]?.currency || 'PKR';

  const locale = await getPlatformLocale();
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;"><strong>${value}</strong></td></tr>`;

  void notifySuperAdmins(
    `Daily Platform Report — ${formatPlatformDate(new Date(), locale)}`,
    `<p>Platform activity for the 24 hours ending ${formatPlatformDateTime(new Date(), locale)}:</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
       ${row('New shops registered', newTenants)}
       ${row('New repair tickets', newTickets)}
       ${row('Repairs delivered', deliveredTickets)}
       ${row('Payments completed', `${completed.length} (${currency} ${revenue.toLocaleString()})`)}
       ${row('Payments failed', failed.length)}
       ${row('Total shops (active)', `${totalTenants} (${activeTenants})`)}
     </table>`
  );
}

let lastDailyRunDate = '';

/** One scheduler pass: resource sampling every call, dailies once per calendar day.
 * `force` runs the dailies regardless — used by the /api/cron/tick route where
 * the external cron itself provides the once-a-day cadence. */
export async function runSchedulerTick(force = false): Promise<void> {
  try {
    await connectDB();
    await sampleResources();

    const today = new Date().toISOString().slice(0, 10);
    if (force || today !== lastDailyRunDate) {
      lastDailyRunDate = today;
      await Promise.allSettled([
        runAutoBackup(),
        runAutoSuspend(),
        runStorageCheck(),
        runSubscriptionExpiryAlerts(),
        runTicketEscalations(),
        runDailyReport(),
      ]);
    }
  } catch {
    // scheduler must never crash the process
  }
}

const tick = runSchedulerTick;

/** Starts the in-process scheduler exactly once per running server, guarded against
 * Next.js dev-mode hot-reload re-imports via a global flag (same pattern as lib/db.ts). */
export function startScheduler(): void {
  const g = global as any;
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  setInterval(() => void tick(), TICK_MS);
  void tick(); // run once shortly after boot rather than waiting a full interval
}
