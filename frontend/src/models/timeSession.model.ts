// src/models/timeSession.model.ts
// A technician's logged work interval on a ticket. Created "active" (no endedAt)
// when the timer starts, closed on stop. One collection (not embedded in the
// ticket) so a technician's day view can span tickets cheaply.

import mongoose, { Schema, Document, Model } from 'mongoose';

export const MAX_SESSION_SECONDS = 24 * 60 * 60; // a session can never exceed 24h

export interface ITimeSession extends Document {
  tenantId:       mongoose.Types.ObjectId;
  ticketId:       mongoose.Types.ObjectId;
  technicianId:   mongoose.Types.ObjectId;
  technicianName: string;
  startedAt:      Date;
  endedAt:        Date | null;      // null while the timer is running
  durationSeconds: number;          // 0 while running; set on stop, editable after
  note?:          string;
  createdAt:      Date;
  updatedAt:      Date;
}

const TimeSessionSchema = new Schema<ITimeSession>(
  {
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketId:       { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    technicianId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    technicianName: { type: String, required: true },
    startedAt:      { type: Date, required: true },
    endedAt:        { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0, max: MAX_SESSION_SECONDS },
    note:           { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

TimeSessionSchema.index({ tenantId: 1, technicianId: 1, startedAt: -1 });
TimeSessionSchema.index({ tenantId: 1, ticketId: 1 });
// Fast "is a timer already running?" lookups.
TimeSessionSchema.index({ technicianId: 1, endedAt: 1 });

const TimeSession: Model<ITimeSession> =
  mongoose.models.TimeSession ||
  mongoose.model<ITimeSession>('TimeSession', TimeSessionSchema, 'timesessions');

export default TimeSession;
