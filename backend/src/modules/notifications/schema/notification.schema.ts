import mongoose, { Document, Schema } from 'mongoose';

export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';
export type NotificationType =
  | 'ticket_created' | 'ticket_assigned' | 'estimate_sent' | 'repair_completed'
  | 'ready_for_pickup' | 'ticket_delivered' | 'status_changed'
  | 'invoice_generated' | 'payment_received' | 'payment_failed'
  | 'low_stock' | 'lead_routed' | 'lead_unclaimed' | 'lead_expired';

export interface INotification extends Document {
  tenantId: string;
  userId?: string;
  customerId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  templateId?: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  providerReference?: string;
  errorMessage?: string;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenantId:          { type: String, required: true, index: true },
    userId:            { type: String, index: true },
    customerId:        { type: String, index: true },
    type:              { type: String, required: true },
    channel:           { type: String, required: true, enum: ['in_app', 'email', 'sms', 'whatsapp', 'push'] },
    title:             { type: String, required: true },
    message:           { type: String, required: true },
    templateId:        { type: String },
    payload:           { type: Schema.Types.Mixed, default: {} },
    status:            { type: String, required: true, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    providerReference: { type: String },
    errorMessage:      { type: String },
    readAt:            { type: Date },
    sentAt:            { type: Date },
  },
  { timestamps: true }
);

// In-app inbox queries
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
// Idempotency window
notificationSchema.index({ tenantId: 1, type: 1, channel: 1, 'payload.idempotencyKey': 1, createdAt: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
