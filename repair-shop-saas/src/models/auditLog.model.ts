import mongoose, { Schema, Document } from 'mongoose';

/**
 * Audit Log Interface for TypeScript
 */
export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Action Constants - Single source of truth for audit actions
 */
export const AUDIT_ACTIONS = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_REGISTER: 'AUTH_REGISTER',
  AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  AUTH_PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  USER_INVITED: 'USER_INVITED',
  USER_ROLE_UPDATED: 'USER_ROLE_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_STATUS_UPDATED: 'TICKET_STATUS_UPDATED',
  TICKET_DELETED: 'TICKET_DELETED',
  ESTIMATE_CREATED: 'ESTIMATE_CREATED',
  ESTIMATE_APPROVED: 'ESTIMATE_APPROVED',
  ESTIMATE_REJECTED: 'ESTIMATE_REJECTED',
  INVOICE_CREATED: 'INVOICE_CREATED',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
  INVENTORY_PART_USED: 'INVENTORY_PART_USED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  TENANT_SETTINGS_UPDATED: 'TENANT_SETTINGS_UPDATED',
};

const AuditLogSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'tenants', required: true }, // Mandatory for multi-tenancy 
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true }, // e.g., 'user', 'ticket'
    entityId: { type: Schema.Types.ObjectId },
    details: { type: Schema.Types.Mixed }, // Extra context [cite: 149]
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false }, // Logs are immutable [cite: 151]
    collection: 'auditLogs' 
  }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);