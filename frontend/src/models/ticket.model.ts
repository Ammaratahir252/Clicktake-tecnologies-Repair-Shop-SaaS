// src/models/ticket.model.ts

import mongoose, { Schema, Document, Model } from 'mongoose';
import { TicketStatus } from '@/lib/enums';

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// ─── Sub-Document Interfaces ──────────────────────────────────────────────────

export interface ITicketNote {
  authorId:   mongoose.Types.ObjectId;
  authorName: string;
  content:    string;
  createdAt:  Date;
}

// M3 — Part usage on a ticket
export interface ITicketPartUsed {
  partId:   mongoose.Types.ObjectId;
  name:     string;
  sku:      string;
  quantity: number;
  addedAt:  Date;
}

export interface ITicketPhoto {
  url:            string;
  publicId?:      string; // Cloudinary public_id (absent on legacy /uploads/... photos)
  type:           string; // before | during | after | damage | parts
  note?:          string;
  uploadedBy:     mongoose.Types.ObjectId;
  uploadedByName: string;
  createdAt:      Date;
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
  driverId?:      mongoose.Types.ObjectId;
  driverLocation?: { lat: number; lng: number; updatedAt: Date };
  deviceBrand:    string;
  deviceModel:    string;
  deviceColor?:   string;
  deviceIMEI?:    string;
  issue:          string;
  diagnosisNotes?: string;
  /** Repair urgency. Older tickets have no value — treat as 'medium'. */
  priority?:      TicketPriority;
  /** Promised completion date — drives the "Due Soon" sort. Optional. */
  dueDate?:       Date | null;
  status:         TicketStatus;
  estimateAmount?: number;
  photos:         ITicketPhoto[];
  notes:          ITicketNote[];
  statusHistory:  ITicketHistoryEntry[];
  partsUsed:      ITicketPartUsed[];  // M3 — parts consumed in this repair
  // ── GPS (Module: Global GPS) ──────────────────────────────────────────────
  // Snapshot of where THIS delivery should go — independent of the customer's
  // saved address, since a customer may want delivery somewhere else (work,
  // a relative's house, etc). Set via device GPS on the customer delivery page.
  deliveryLocation?: {
    lat: number;
    lng: number;
    address?: string;    // reverse-geocoded human-readable address
    updatedAt: Date;
  };
  /** When the stuck-ticket escalation alert fired for this ticket — null until escalated. */
  escalationAlertedAt?: Date | null;
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

const TicketPhotoSchema = new Schema<ITicketPhoto>(
  {
    url:            { type: String, required: true },
    publicId:       { type: String },
    type:           { type: String, required: true, default: 'before' },
    note:           { type: String },
    uploadedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByName: { type: String, required: true },
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
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    driverLocation: {
      type: new Schema(
        {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
          updatedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: undefined,
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
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
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
      type: [TicketPhotoSchema],
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
    // M3 — parts consumed in this repair (append only via /api/tickets/:id/parts)
    partsUsed: {
      type: [
        new Schema(
          {
            partId:   { type: Schema.Types.ObjectId, ref: 'Part', required: true },
            name:     { type: String, required: true },
            sku:      { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            addedAt:  { type: Date, default: Date.now },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    deliveryLocation: {
      lat:       { type: Number },
      lng:       { type: Number },
      address:   { type: String },
      updatedAt: { type: Date },
    },
    escalationAlertedAt: { type: Date, default: null },
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
