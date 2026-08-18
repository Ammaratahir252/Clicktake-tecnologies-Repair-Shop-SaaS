// src/models/typingStatus.model.ts
// Ephemeral "is typing" signal — one upserted doc per (tenant, user, scope).
// `scope` is either the literal 'team' (team channel) or another user's id
// (a DM thread, from the PERSPECTIVE of "who this typing signal is aimed at").
// A TTL index auto-cleans stale rows; queries additionally filter by a recent
// time window so staleness never depends on TTL's ~60s sweep granularity.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITypingStatus extends Document {
  tenantId:  mongoose.Types.ObjectId;
  userId:    mongoose.Types.ObjectId;
  userName:  string;
  scope:     string;
  updatedAt: Date;
}

const TypingStatusSchema = new Schema<ITypingStatus>({
  tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String, required: true },
  scope:     { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

TypingStatusSchema.index({ tenantId: 1, scope: 1, userId: 1 }, { unique: true });
// Safety-net cleanup only — "is this recent enough" is always re-checked in the
// query itself (a much tighter window than this), never inferred from the
// document simply still existing.
TypingStatusSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 15 });

const TypingStatus: Model<ITypingStatus> =
  mongoose.models.TypingStatus || mongoose.model<ITypingStatus>('TypingStatus', TypingStatusSchema);

export default TypingStatus;
