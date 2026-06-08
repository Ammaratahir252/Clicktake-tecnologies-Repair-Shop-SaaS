// src/models/part.model.ts
// M3 — Inventory & Parts Management
// NAMING: camelCase only, collection name 'parts'

import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IPart extends Document {
  tenantId:      mongoose.Types.ObjectId;  // MANDATORY — multi-tenancy scoping
  name:          string;                   // e.g. "iPhone 13 Screen"
  sku:           string;                   // Stock Keeping Unit — unique per tenant
  category:      string;                   // e.g. "Screen", "Battery"
  quantity:      number;                   // current stock count — managed via movements
  costPrice:     number;                   // what the shop pays (PKR)
  sellPrice:     number;                   // what the shop charges customer (PKR)
  lowStockLimit: number;                   // alert threshold — default 5
  description?:  string;                   // optional notes
  supplier?:     string;                   // optional supplier name
  isActive:      boolean;                  // soft delete — never hard delete
  createdAt:     Date;
  updatedAt:     Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const PartSchema = new Schema<IPart>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'tenantId is required'],
    },
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellPrice: {
      type: Number,
      required: [true, 'Sell price is required'],
      min: [0, 'Sell price cannot be negative'],
    },
    lowStockLimit: {
      type: Number,
      default: 5,
      min: [0, 'Low stock limit cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
    supplier: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'parts',
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique SKU per tenant — same SKU allowed in different shops
PartSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
// Category filter queries
PartSchema.index({ tenantId: 1, category: 1 });
// Active parts queries (default filter)
PartSchema.index({ tenantId: 1, isActive: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

const Part: Model<IPart> =
  (mongoose.models.Part as Model<IPart>) ||
  mongoose.model<IPart>('Part', PartSchema, 'parts');

export default Part;
