import mongoose from 'mongoose';
import connectDB from '../lib/db'; // Update: Removed {} to fix the import error
import { AuditLog } from '../models/auditLog.model';

interface AuditLogData {
  tenantId?: string; // omitted/invalid for tenant-less platform actions (super_admin login/logout, etc.)
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry safely. [cite: 143]
 * This function should NOT be awaited in the main response chain to avoid blocking. [cite: 156]
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // 1. tenantId is optional — many real events (super_admin login/logout, platform admin
    // actions) have no associated tenant. Some call sites still pass legacy sentinel
    // strings like "unknown" instead of omitting it; only keep it if it's a real ObjectId,
    // otherwise drop it rather than letting Mongoose's cast throw.
    const tenantId = data.tenantId && mongoose.Types.ObjectId.isValid(data.tenantId) ? data.tenantId : undefined;

    // 2. Security: Ensure sensitive data like passwords are never logged [cite: 144, 156]
    if (data.details && data.details.password) {
      delete data.details.password;
    }

    // 3. Establish DB connection [cite: 156]
    await connectDB();

    // 4. Save the audit record [cite: 156]
    const log = new AuditLog({ ...data, tenantId });
    await log.save();

  } catch (error) {
    // 5. Silent fail: Audit log failure must NEVER crash the main API [cite: 144, 156]
    console.error('Failed to create audit log:', error);
  }
}