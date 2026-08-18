// src/models/chatThread.model.ts
// One denormalized summary row per DM pair (tenantId, userA, userB — userA is
// always the lexicographically smaller id, so a pair always maps to exactly
// one document regardless of who's asking; see lib/chatThreadKey.ts). Kept in
// sync in-place whenever a DirectMessage is sent (POST /api/chat/direct) or
// read (PATCH /api/chat/direct/read).
//
// This exists purely so GET /api/chat/contacts can be O(number of teammates)
// instead of O(every DM ever exchanged). Before this model, that endpoint ran
// a DirectMessage.aggregate() (match + in-memory sort + group) over a user's
// ENTIRE message history on every poll tick, for every open tab — an
// unbounded, ever-growing read cost paid every few seconds forever. This
// table turns that into two small indexed finds.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatThread extends Document {
  tenantId:     mongoose.Types.ObjectId;
  userA:        mongoose.Types.ObjectId;
  userB:        mongoose.Types.ObjectId;
  lastMessage:  string;
  lastSenderId: mongoose.Types.ObjectId;
  lastAt:       Date;
  unreadA:      number; // messages FROM userB TO userA that userA hasn't read yet
  unreadB:      number; // messages FROM userA TO userB that userB hasn't read yet
}

const ChatThreadSchema = new Schema<IChatThread>({
  tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userA:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userB:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessage:  { type: String, default: '' },
  lastSenderId: { type: Schema.Types.ObjectId, ref: 'User' },
  lastAt:       { type: Date, default: Date.now },
  unreadA:      { type: Number, default: 0 },
  unreadB:      { type: Number, default: 0 },
});

// The canonical lookup: exactly one thread per (tenant, pair). Also serves as
// the index for "my threads" queried as userA (a prefix of this index).
ChatThreadSchema.index({ tenantId: 1, userA: 1, userB: 1 }, { unique: true });
// "My threads" is queried as `$or: [{userA: me}, {userB: me}]` — the compound
// index above only covers the userA branch as a prefix, so this covers userB.
ChatThreadSchema.index({ tenantId: 1, userB: 1 });

const ChatThread: Model<IChatThread> =
  mongoose.models.ChatThread || mongoose.model<IChatThread>('ChatThread', ChatThreadSchema);

export default ChatThread;
