// ============================================================
// DibnowRepairSaaS — Audit Log Model
// IMMUTABLE — no UPDATE or DELETE ever permitted on this collection
// Architecture doc requirement: append-only enforcement
// ============================================================

import mongoose, { Document, Schema } from 'mongoose';
import { AuditAction } from '../types';

export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: AuditAction;
  entityType: string;     // 'invoice' | 'ticket' | 'user' | etc.
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, enum: Object.values(AuditAction), required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    ipAddress: { type: String, required: true },
    userAgent: { type: String },
    sessionId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    // No updatedAt — audit logs must never be modified
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// ─── Compound indexes for fast queries ───────────────────────
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });

// ─── Block UPDATE and DELETE at schema level ──────────────────
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('SECURITY: Audit logs are immutable — updates are forbidden');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('SECURITY: Audit logs are immutable — updates are forbidden');
});

auditLogSchema.pre('updateMany', function () {
  throw new Error('SECURITY: Audit logs are immutable — updates are forbidden');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('SECURITY: Audit logs are immutable — deletes are forbidden');
});

auditLogSchema.pre('deleteMany', function () {
  throw new Error('SECURITY: Audit logs are immutable — deletes are forbidden');
});

export const AuditLogModel = mongoose.model<IAuditLog>('audit_logs', auditLogSchema);

// ─── Audit log service (used by all modules) ─────────────────
export const createAuditLog = async (params: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await AuditLogModel.create({
      ...params,
      tenantId: new mongoose.Types.ObjectId(params.tenantId),
      userId: new mongoose.Types.ObjectId(params.userId),
    });
  } catch (error) {
    // Audit log failure should NEVER crash the main operation
    // Log the failure but don't throw
    console.error('AUDIT LOG WRITE FAILED:', error);
  }
};
