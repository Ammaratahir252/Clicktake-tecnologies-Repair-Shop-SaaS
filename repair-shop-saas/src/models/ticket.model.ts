// src/models/ticket.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';
import { TicketStatus } from '@/lib/enums';

// ─── Sub-Document Interfaces ──────────────────────────────────────────────────

export interface ITicketNote {
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  content:    string;
  createdAt:  Date;
}

export interface ITicketHistoryEntry {
  changedBy:     mongoose.Types.ObjectId;
  changedByName: string;
  fromStatus:    TicketStatus;
  toStatus:      TicketStatus;
  note?:         string;
  createdAt:     Date;
}

// ─── Main Ticket Interface ────────────────────────────────────────────────────

export interface ITicket extends Document {
  tenantId:       mongoose.Types.ObjectId;  // ALWAYS required — multi-tenancy
  ticketNumber:   string;                   // e.g. TKT-0042
  customerId:     mongoose.Types.ObjectId;
  technicianId?:  mongoose.Types.ObjectId;
  deviceBrand:    string;
  deviceModel:    string;
  deviceColor?:   string;
  deviceIMEI?:    string;
  issue:          string;
  diagnosisNotes?: string;
  status:         TicketStatus;
  estimateAmount?: number;
  photos:         string[];
  notes:          ITicketNote[];
  statusHistory:  ITicketHistoryEntry[];
  createdAt:      Date;
  updatedAt:      Date;
}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const TicketNoteSchema = new Schema<ITicketNote>(
  {
    authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    content:    { type: String, required: true, trim: true },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const TicketHistoryEntrySchema = new Schema<ITicketHistoryEntry>(
  {
    changedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByName: { type: String, required: true },
    fromStatus:    { type: String, enum: Object.values(TicketStatus), required: true },
    toStatus:      { type: String, enum: Object.values(TicketStatus), required: true },
    note:          { type: String },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const TicketSchema = new Schema<ITicket>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deviceBrand: {
      type: String,
      required: [true, 'Device brand is required'],
      trim: true,
    },
    deviceModel: {
      type: String,
      required: [true, 'Device model is required'],
      trim: true,
    },
    deviceColor: {
      type: String,
      trim: true,
    },
    deviceIMEI: {
      type: String,
      trim: true,
    },
    issue: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
    },
    diagnosisNotes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.received,
      required: true,
    },
    estimateAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    photos: {
      type: [String],
      default: [],
    },
    notes: {
      type: [TicketNoteSchema],
      default: [],
    },
    statusHistory: {
      type: [TicketHistoryEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

TicketSchema.index({ tenantId: 1, status: 1 });
TicketSchema.index({ tenantId: 1, customerId: 1 });
TicketSchema.index({ tenantId: 1, technicianId: 1 });
TicketSchema.index({ tenantId: 1, ticketNumber: 1 }, { unique: true });

// ─── Export ───────────────────────────────────────────────────────────────────

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema, 'tickets');

export default Ticket;
