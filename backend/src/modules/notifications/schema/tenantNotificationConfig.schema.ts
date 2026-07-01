import mongoose, { Document, Schema } from 'mongoose';

export interface IQuietHours {
  enabled: boolean;
  start: string; // HH:mm local time
  end: string;   // HH:mm local time
}

export interface ITenantNotificationConfig extends Document {
  tenantId: string;
  emailProvider: string;
  smsProvider: string;
  whatsappProvider: string;
  providerKeys: Record<string, string>; // AES-256 encrypted values
  quietHours: IQuietHours;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantNotificationConfigSchema = new Schema<ITenantNotificationConfig>(
  {
    tenantId:          { type: String, required: true, unique: true },
    emailProvider:     { type: String, default: 'resend' },
    smsProvider:       { type: String, default: 'twilio' },
    whatsappProvider:  { type: String, default: 'twilio' },
    providerKeys:      { type: Schema.Types.Mixed, default: {} },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start:   { type: String, default: '22:00' },
      end:     { type: String, default: '08:00' },
    },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

export const TenantNotificationConfig = mongoose.model<ITenantNotificationConfig>(
  'TenantNotificationConfig',
  tenantNotificationConfigSchema
);
