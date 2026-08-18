// src/models/chatMessage.model.ts
// Internal team chat — one shared channel per tenant. Every shop's staff
// (owner/manager/frontdesk/technician/driver) can talk to the whole team here.
// Strictly tenant-scoped: every query in the API layer filters by the caller's
// own verified tenantId, so one shop's messages can never appear in another's.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  tenantId:   mongoose.Types.ObjectId;
  senderId:   mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  message:    string;
  createdAt:  Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message:    { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Every read is `{tenantId}` + a createdAt sort/pagination — this index serves both.
ChatMessageSchema.index({ tenantId: 1, createdAt: -1 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
