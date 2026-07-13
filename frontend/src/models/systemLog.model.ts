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

const SystemLog: Model<ISystemLog> =
  mongoose.models.SystemLog || mongoose.model<ISystemLog>('SystemLog', schema);

export default SystemLog;
