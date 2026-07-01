import connectDB from '../lib/db'; // Update: Removed {} to fix the import error
import { AuditLog } from '../models/auditLog.model';

interface AuditLogData {
  tenantId: string;
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
    // 1. Mandatory field check: tenantId is strictly required [cite: 156]
    if (!data.tenantId) {
      console.error('Audit Log Error: tenantId is mandatory');
      return;
    }

    // 2. Security: Ensure sensitive data like passwords are never logged [cite: 144, 156]
    if (data.details && data.details.password) {
      delete data.details.password;
    }

    // 3. Establish DB connection [cite: 156]
    await connectDB();

    // 4. Save the audit record [cite: 156]
    const log = new AuditLog(data);
    await log.save();
    
  } catch (error) {
    // 5. Silent fail: Audit log failure must NEVER crash the main API [cite: 144, 156]
    console.error('Failed to create audit log:', error);
  }
}