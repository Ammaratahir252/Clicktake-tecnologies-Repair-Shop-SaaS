// src/models/stockMovement.model.ts
// M3 — Inventory & Parts Management
// APPEND-ONLY audit trail — NEVER update or delete records

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Movement Type Constants ───────────────────────────────────────────────────

export const STOCK_MOVEMENT_TYPES = ['added', 'used', 'adjusted', 'returned', 'damaged'] as const;
export type StockMovementType = typeof STOCK_MOVEMENT_TYPES[number];

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IStockMovement extends Document {
  tenantId:      mongoose.Types.ObjectId;  // MANDATORY — multi-tenancy scoping
  partId:        mongoose.Types.ObjectId;  // reference to parts collection
  type:          StockMovementType;        // added | used | adjusted | returned | damaged
  quantity:      number;                   // units affected — always positive
  previousStock: number;                   // stock level BEFORE this movement
  newStock:      number;                   // stock level AFTER this movement
  ticketId?:     mongoose.Types.ObjectId;  // only for 'used' type
  performedBy:   mongoose.Types.ObjectId;  // userId who performed the action
  note?:         string;                   // optional reason/note
  createdAt:     Date;                     // auto via timestamps
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const StockMovementSchema = new Schema<IStockMovement>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenantId is required'],
    },
    partId: {
      type: Schema.Types.ObjectId,
      ref: 'Part',
      required: [true, 'partId is required'],
    },
    type: {
      type: String,
      enum: STOCK_MOVEMENT_TYPES,
      required: [true, 'Movement type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'performedBy (userId) is required'],
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    // Append-only: createdAt only, no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'stockMovements',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Part movement history
StockMovementSchema.index({ tenantId: 1, partId: 1 });
// Filter by movement type
StockMovementSchema.index({ tenantId: 1, type: 1 });
// Ticket-parts connection
StockMovementSchema.index({ tenantId: 1, ticketId: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const StockMovement: Model<IStockMovement> =
  (mongoose.models.StockMovement as Model<IStockMovement>) ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema, 'stockMovements');

export default StockMovement;
