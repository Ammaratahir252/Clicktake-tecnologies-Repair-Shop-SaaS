// ============================================================
// DibnowRepairSaaS — Tenant Model
// Parent of ALL records — every query scoped to tenantId
// ============================================================

import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subdomain: string;
  plan: 'free' | 'growth' | 'enterprise';
  isActive: boolean;
  ownerUserId: mongoose.Types.ObjectId;
  features: string[];
  currency: string;
  timezone: string;
  logo?: string;
  settings: {
    taxRate: number;
    taxName: string;
    invoicePrefix: string;
    ticketPrefix: string;
    allowPartialPayments: boolean;
    paymentGateways: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    plan: {
      type: String,
      enum: ['free', 'growth', 'enterprise'],
      default: 'free',
    },
    isActive: { type: Boolean, default: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    features: [{ type: String }],
    currency: { type: String, default: 'USD', uppercase: true },
    timezone: { type: String, default: 'UTC' },
    logo: { type: String },
    settings: {
      taxRate: { type: Number, default: 0 },
      taxName: { type: String, default: 'Tax' },
      invoicePrefix: { type: String, default: 'INV' },
      ticketPrefix: { type: String, default: 'REP' },
      allowPartialPayments: { type: Boolean, default: true },
      paymentGateways: [{ type: String }],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const TenantModel = mongoose.model<ITenant>('tenants', tenantSchema);
