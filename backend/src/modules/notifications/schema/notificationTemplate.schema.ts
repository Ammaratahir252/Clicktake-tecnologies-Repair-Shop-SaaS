import mongoose, { Document, Schema } from 'mongoose';

export type TemplateChannel = 'email' | 'sms' | 'whatsapp' | 'in_app' | 'push';

export interface INotificationTemplate extends Document {
  tenantId?: string; // undefined = platform-default template
  key: string;
  channel: TemplateChannel;
  subject?: string;
  body: string;
  language: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    tenantId: { type: String, index: true },
    key:      { type: String, required: true },
    channel:  { type: String, required: true, enum: ['email', 'sms', 'whatsapp', 'in_app', 'push'] },
    subject:  { type: String },
    body:     { type: String, required: true },
    language: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Lookup: tenant-specific first, then platform default (null tenantId)
notificationTemplateSchema.index({ key: 1, channel: 1, tenantId: 1 });

export const NotificationTemplate = mongoose.model<INotificationTemplate>(
  'NotificationTemplate',
  notificationTemplateSchema
);
