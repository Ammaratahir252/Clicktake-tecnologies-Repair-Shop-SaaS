import mongoose, { Schema, Document, Model } from 'mongoose';

/** Records platform-operational events (backups, cache clears, config import/export, scheduled sweeps) — separate from user-facing AuditLog. */
export interface ISystemLog extends Document {
  category: 'backup' | 'cleanup' | 'config' | 'cache' | 'error' | 'monitor';
  message: string;
  status: 'ok' | 'warning' | 'error';
  details?: Record<string, any>;
  createdAt: Date;
}

const schema = new Schema<ISystemLog>(
  {
    category: { type: String, enum: ['backup', 'cleanup', 'config', 'cache', 'error', 'monitor'], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['ok', 'warning', 'error'], default: 'ok' },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Fires the "System Alert" super-admin email (Settings → Notifications) whenever an
// error-level operational event is logged, from one choke point for every caller.
schema.post('save', function (doc: ISystemLog) {
  if (doc.status !== 'error') return;
  void (async () => {
    try {
      const { getPlatformSettings } = await import('@/lib/platformSettings');
      const settings = await getPlatformSettings();
      if (!settings.notifs.systemAlert) return;
      const { notifySuperAdmins } = await import('@/lib/notifications');
      await notifySuperAdmins(
        `System Alert — ${doc.category}`,
        `<p>An error-level system event was just recorded:</p>
         <p><strong>${doc.message}</strong></p>
         ${doc.details ? `<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:12px;">${JSON.stringify(doc.details, null, 2)}</pre>` : ''}`
      );
    } catch {
      // Alerting must never break the operation that logged the event.
    }
  })();
});

const SystemLog: Model<ISystemLog> =
  mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', schema);

export default SystemLog;
