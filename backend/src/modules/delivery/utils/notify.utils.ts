// ============================================================
// Delivery — in-app notification helpers
//
// The delivery backend shares its MongoDB with the Next.js app, so writing
// straight into the `notifications` collection makes alerts appear in the
// recipient's dashboard bell (frontend /api/notifications reads the same
// collection). Raw collection access is deliberate — this module doesn't own
// User/Customer schemas and shouldn't duplicate them just to insert one doc.
// ============================================================

import mongoose from 'mongoose';
import { logger } from '../../../utils/logger';

export interface DeliveryNotification {
  tenantId: string;
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const createInAppNotification = async (opts: DeliveryNotification): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(opts.tenantId) || !mongoose.Types.ObjectId.isValid(opts.recipientUserId)) return;
    const now = new Date();
    await mongoose.connection.collection('notifications').insertOne({
      tenantId: new mongoose.Types.ObjectId(opts.tenantId),
      recipientUserId: new mongoose.Types.ObjectId(opts.recipientUserId),
      type: opts.type,
      title: opts.title,
      message: opts.message,
      metadata: opts.metadata ?? {},
      readAt: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    // Notifications are best-effort — never break the delivery operation.
    logger.warn('In-app notification insert failed', { err: (err as Error).message });
  }
};

/**
 * DeliveryJob.customerId references a Customer document, not a User — the
 * portal login is a separate User row matched by phone (same mapping the
 * Next.js app uses). Returns null when the customer has no portal account.
 */
export const resolveCustomerUserId = async (customerId: string): Promise<string | null> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(customerId)) return null;
    const customer = await mongoose.connection.collection('customers').findOne(
      { _id: new mongoose.Types.ObjectId(customerId) },
      { projection: { phone: 1 } }
    );
    if (!customer?.phone) return null;
    const user = await mongoose.connection.collection('users').findOne(
      { phone: String(customer.phone).trim(), role: 'customer' },
      { projection: { _id: 1 } }
    );
    return user?._id?.toString() ?? null;
  } catch {
    return null;
  }
};
