import mongoose, { Document, Schema } from 'mongoose';

export interface IChannelPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  in_app: boolean;
}

export interface INotificationPreferences extends Document {
  tenantId: string;
  userId?: string;
  customerId?: string;
  channels: IChannelPreferences;
  optOutToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    tenantId:    { type: String, required: true, index: true },
    userId:      { type: String, index: true },
    customerId:  { type: String, index: true },
    channels: {
      email:     { type: Boolean, default: true },
      sms:       { type: Boolean, default: true },
      whatsapp:  { type: Boolean, default: true },
      push:      { type: Boolean, default: true },
      in_app:    { type: Boolean, default: true },
    },
    optOutToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

notificationPreferencesSchema.index({ tenantId: 1, userId: 1 },      { unique: true, sparse: true });
notificationPreferencesSchema.index({ tenantId: 1, customerId: 1 },  { unique: true, sparse: true });

export const NotificationPreferences = mongoose.model<INotificationPreferences>(
  'NotificationPreferences',
  notificationPreferencesSchema
);
