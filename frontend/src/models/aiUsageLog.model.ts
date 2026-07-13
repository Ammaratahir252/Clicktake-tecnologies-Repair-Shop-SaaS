import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAIUsageLog extends Document {
  tenantId?: mongoose.Types.ObjectId;
  provider: string;
  aiModel: string;
  estimatedCostUsd: number;
  createdAt: Date;
}

const schema = new Schema<IAIUsageLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    provider: { type: String, required: true },
    aiModel: { type: String, required: true },
    estimatedCostUsd: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ tenantId: 1, createdAt: -1 });

const AIUsageLog: Model<IAIUsageLog> =
  mongoose.models.AIUsageLog || mongoose.model<IAIUsageLog>('AIUsageLog', schema);

export default AIUsageLog;
