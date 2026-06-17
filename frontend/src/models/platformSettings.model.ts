import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSettings extends Document {
  platformName:      string;
  domain:            string;
  supportEmail:      string;
  timezone:          string;
  currency:          string;
  maintenanceMode:   boolean;
  twoFactor:         boolean;
  sessionTimeout:    number;
  passwordMinLength: number;
  ipWhitelist:       string;
  notifs: {
    newTenant:        boolean;
    ticketEscalation: boolean;
    dailyReport:      boolean;
    paymentFailed:    boolean;
    systemAlert:      boolean;
  };
  updatedAt: Date;
}

const schema = new Schema<IPlatformSettings>(
  {
    platformName:      { type: String, default: 'RepairShop SaaS' },
    domain:            { type: String, default: 'repairshop.app' },
    supportEmail:      { type: String, default: 'support@repairshop.app' },
    timezone:          { type: String, default: 'Asia/Karachi' },
    currency:          { type: String, default: 'PKR' },
    maintenanceMode:   { type: Boolean, default: false },
    twoFactor:         { type: Boolean, default: false },
    sessionTimeout:    { type: Number, default: 60 },
    passwordMinLength: { type: Number, default: 8 },
    ipWhitelist:       { type: String, default: '' },
    notifs: {
      newTenant:        { type: Boolean, default: true },
      ticketEscalation: { type: Boolean, default: true },
      dailyReport:      { type: Boolean, default: false },
      paymentFailed:    { type: Boolean, default: true },
      systemAlert:      { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const PlatformSettings: Model<IPlatformSettings> =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettings>('PlatformSettings', schema);

export default PlatformSettings;
