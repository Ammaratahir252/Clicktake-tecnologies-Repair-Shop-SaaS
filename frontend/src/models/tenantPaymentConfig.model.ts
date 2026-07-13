import mongoose, { Schema, Document, Model } from 'mongoose';

// A shop's own payment gateway credentials, so that shop's customers can pay that shop
// directly (separate from the platform's own gateway accounts, which are env-var
// configured and only used for subscription billing). One sub-object per gateway —
// a tenant can enable any combination of these independently.
export interface ITenantPaymentConfig extends Document {
  tenantId: mongoose.Types.ObjectId;

  easypaisa: {
    enabled:     boolean;
    storeId:     string;
    hashKeyEnc:  string; // AES-256-GCM encrypted via lib/crypto.ts
    usernameEnc: string;
    passwordEnc: string;
    environment: 'uat' | 'live';
  };

  jazzcash: {
    enabled:           boolean;
    merchantId:        string;
    passwordEnc:       string;
    integritySaltEnc:  string;
    environment:       'uat' | 'live';
  };

  stripe: {
    enabled:          boolean;
    secretKeyEnc:      string;
    publishableKey:    string; // not secret — safe to store/return plain
    webhookSecretEnc:  string;
  };

  paypal: {
    enabled:        boolean;
    clientIdEnc:    string;
    clientSecretEnc: string;
    mode:           'sandbox' | 'live';
  };

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ITenantPaymentConfig>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },

    easypaisa: {
      enabled:     { type: Boolean, default: false },
      storeId:     { type: String, default: '' },
      hashKeyEnc:  { type: String, default: '' },
      usernameEnc: { type: String, default: '' },
      passwordEnc: { type: String, default: '' },
      environment: { type: String, enum: ['uat', 'live'], default: 'uat' },
    },

    jazzcash: {
      enabled:          { type: Boolean, default: false },
      merchantId:       { type: String, default: '' },
      passwordEnc:      { type: String, default: '' },
      integritySaltEnc: { type: String, default: '' },
      environment:      { type: String, enum: ['uat', 'live'], default: 'uat' },
    },

    stripe: {
      enabled:          { type: Boolean, default: false },
      secretKeyEnc:     { type: String, default: '' },
      publishableKey:   { type: String, default: '' },
      webhookSecretEnc: { type: String, default: '' },
    },

    paypal: {
      enabled:         { type: Boolean, default: false },
      clientIdEnc:     { type: String, default: '' },
      clientSecretEnc: { type: String, default: '' },
      mode:            { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
    },
  },
  { timestamps: true }
);

const TenantPaymentConfig: Model<ITenantPaymentConfig> =
  mongoose.models.TenantPaymentConfig ||
  mongoose.model<ITenantPaymentConfig>('TenantPaymentConfig', schema);

export default TenantPaymentConfig;
