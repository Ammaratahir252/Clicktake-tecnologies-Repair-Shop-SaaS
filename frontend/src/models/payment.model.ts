import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  tenantId:            mongoose.Types.ObjectId;
  kind:                'subscription' | 'invoice';
  referenceId:         mongoose.Types.ObjectId; // Subscription._id or Ticket._id
  amount:              number;
  currency:            string;
  gateway:              'easypaisa' | 'jazzcash' | 'stripe' | 'paypal' | 'cash' | 'card';
  environment:          string; // 'uat'|'live' (EasyPaisa/JazzCash), 'sandbox'|'live' (PayPal), 'test'|'live' (Stripe), 'in-person' (cash/card)
  method:                'online' | 'in_person';
  status:               'pending' | 'completed' | 'failed';
  gatewayOrderId:        string;
  gatewayTransactionId?: string;
  rawResponse?:          unknown;
  failureReason?:        string;
  recordedBy?:           mongoose.Types.ObjectId; // staff who recorded an in-person payment
  recordedByName?:       string;
  notes?:                string;
  createdAt:             Date;
  updatedAt:             Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    tenantId:             { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind:                 { type: String, enum: ['subscription', 'invoice'], required: true },
    referenceId:          { type: Schema.Types.ObjectId, required: true },
    amount:               { type: Number, required: true },
    currency:             { type: String, default: 'PKR' },
    gateway:              { type: String, enum: ['easypaisa', 'jazzcash', 'stripe', 'paypal', 'cash', 'card'], default: 'easypaisa' },
    environment:          { type: String, default: 'uat' },
    method:                { type: String, enum: ['online', 'in_person'], default: 'online' },
    status:               { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    gatewayOrderId:        { type: String, required: true, unique: true },
    gatewayTransactionId:  { type: String },
    rawResponse:           { type: Schema.Types.Mixed },
    failureReason:         { type: String },
    recordedBy:            { type: Schema.Types.ObjectId, ref: 'User' },
    recordedByName:        { type: String },
    notes:                 { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ tenantId: 1, kind: 1, referenceId: 1 });

// Fires the "Payment Failed" super-admin alert (Settings → Notifications) from a
// single choke point instead of every gateway callback/initiate route separately.
// Dynamic imports keep this model file free of lib-level import cycles.
paymentSchema.pre('save', function (next) {
  (this as any).__becameFailed = this.isModified('status') && this.status === 'failed';
  next();
});
paymentSchema.post('save', function (doc: IPayment) {
  if (!(doc as any).__becameFailed) return;
  void (async () => {
    try {
      const { getPlatformSettings } = await import('@/lib/platformSettings');
      const settings = await getPlatformSettings();
      if (!settings.notifs.paymentFailed) return;
      const { notifySuperAdmins, findTenantName } = await import('@/lib/notifications');
      const shopName = await findTenantName(String(doc.tenantId));
      await notifySuperAdmins(
        'Payment Failed',
        `<p>A <strong>${doc.gateway}</strong> ${doc.kind} payment of <strong>${doc.currency} ${doc.amount.toLocaleString()}</strong> failed for <strong>${shopName}</strong>.</p>
         <p>Reason: ${doc.failureReason || 'unknown'}</p>
         <p>Order reference: ${doc.gatewayOrderId}</p>`
      );
    } catch {
      // Alerting must never break payment processing.
    }
  })();
});

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
