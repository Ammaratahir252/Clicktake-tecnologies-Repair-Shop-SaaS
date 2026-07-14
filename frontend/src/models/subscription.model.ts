import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscription extends Document {
  tenantId:        mongoose.Types.ObjectId;
  plan:            'free' | 'pro' | 'enterprise';
  status:          'active' | 'trial' | 'suspended' | 'cancelled';
  billingCycle:    'monthly' | 'annual';
  amount:          number;
  currency:        string;
  startedAt:       Date;
  nextBillingDate: Date | null;
  cancelledAt:     Date | null;
  notes:           string;
  /** When the "subscription expiring soon" alert was last sent — prevents daily re-alert spam. */
  lastExpiryAlertAt: Date | null;
  createdAt:       Date;
  updatedAt:       Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    tenantId:        { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    plan:            { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    status:          { type: String, enum: ['active', 'trial', 'suspended', 'cancelled'], default: 'active' },
    billingCycle:    { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    amount:          { type: Number, default: 0 },
    currency:        { type: String, default: 'PKR' },
    startedAt:       { type: Date, default: Date.now },
    nextBillingDate: { type: Date, default: null },
    cancelledAt:     { type: Date, default: null },
    notes:           { type: String, default: '' },
    lastExpiryAlertAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
