// src/models/directMessage.model.ts
// One-on-one messages between two staff members of the SAME shop. Distinct
// from ChatMessage (the shared team-wide channel) — this is a private thread
// between exactly two users, still strictly tenant-scoped.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDirectMessage extends Document {
  tenantId:    mongoose.Types.ObjectId;
  senderId:    mongoose.Types.ObjectId;
  senderName:  string;
  senderRole:  string;
  recipientId: mongoose.Types.ObjectId;
  message:     string;
  readAt:      Date | null;
  createdAt:   Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName:  { type: String, required: true },
    senderRole:  { type: String, required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message:     { type: String, required: true, trim: true, maxlength: 4000 },
    readAt:      { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Every thread read is `{tenantId, senderId, recipientId}` in one direction or
// the other (queried via $or) — this index covers both directions well enough
// at this scale. The inbox/contacts summary also groups by tenantId+participant.
DirectMessageSchema.index({ tenantId: 1, senderId: 1, recipientId: 1, createdAt: -1 });
DirectMessageSchema.index({ tenantId: 1, recipientId: 1, readAt: 1 });

const DirectMessage: Model<IDirectMessage> =
  mongoose.models.DirectMessage || mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);

export default DirectMessage;
