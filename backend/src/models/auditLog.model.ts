import mongoose, { Document, Schema } from 'mongoose';
import { AuditAction } from '../types';

export interface IAuditLog extends Document {
  tenantId:   string;
  userId:     string;
  entityType: string;
  entityId:   string;
  action:     AuditAction;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress:  string;
  createdAt:  Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    tenantId:   { type: String, required: true, index: true },
    userId:     { type: String, required: true },
    entityType: { type: String, required: true },
    entityId:   { type: String, required: true, index: true },
    action:     { type: String, enum: Object.values(AuditAction), required: true },
    oldValues:  { type: Schema.Types.Mixed },
    newValues:  { type: Schema.Types.Mixed },
    ipAddress:  { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

// Append-only: no updates or deletes ever permitted on audit logs
auditLogSchema.index({ tenantId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>('audit_logs', auditLogSchema);

export const createAuditLog = async (params: Omit<IAuditLog, '_id' | 'createdAt' | 'updatedAt' | keyof Document>): Promise<void> => {
  await AuditLogModel.create(params);
};
