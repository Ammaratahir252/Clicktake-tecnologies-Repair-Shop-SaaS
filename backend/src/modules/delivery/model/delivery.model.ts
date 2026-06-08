// ============================================================
// DibnowRepairSaaS — Module 9: Doorstep Delivery & Logistics
// UK Edition — GBP, Royal Mail postcodes, UK GDPR / ICO
// ============================================================

import mongoose, { Document, Schema } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────
export enum DeliveryJobType {
  PICKUP   = 'pickup',    // Collect device from customer → shop
  DELIVERY = 'delivery',  // Return repaired device → customer
}

export enum DeliveryStatus {
  PENDING    = 'pending',    // Booked, awaiting driver assignment
  ASSIGNED   = 'assigned',   // Driver assigned, not yet departed
  EN_ROUTE   = 'en_route',   // Driver heading to customer
  ARRIVED    = 'arrived',    // Driver at customer location
  PICKED_UP  = 'picked_up',  // Device collected from customer
  IN_TRANSIT = 'in_transit', // Device in transit to/from shop
  DELIVERED  = 'delivered',  // Job complete
  CANCELLED  = 'cancelled',  // Cancelled before execution
  FAILED     = 'failed',     // Driver unable to complete
}

// UK payment methods — all from M5 gateways
export enum UKPaymentMethod {
  STRIPE        = 'stripe',         // Cards, Apple Pay, Google Pay
  PAYPAL        = 'paypal',         // PayPal balance & cards
  CASH          = 'cash',           // Cash on delivery/pickup
  BANK_TRANSFER = 'bank_transfer',  // UK Faster Payments / BACS
  ONLINE        = 'online',         // Pre-paid via customer portal (any gateway)
}

// UK-specific time slots (morning, afternoon, evening)
export enum UKTimeSlot {
  MORNING   = '08:00-12:00',
  AFTERNOON = '12:00-17:00',
  EVENING   = '17:00-20:00',
  ANYTIME   = 'anytime',
}

// Pricing model — selectable per zone
export enum PricingModel {
  FLAT_POSTCODE = 'flat_postcode',  // Fixed fee per postcode district
  PER_KM        = 'per_km',        // Base + per-km rate
  FREE_ABOVE    = 'free_above',     // Free if invoice exceeds threshold
  PEAK_OFF_PEAK = 'peak_off_peak',  // Different rates by time of day/week
}

// ─── UK Address (Royal Mail standard) ────────────────────────
export interface IUKAddress {
  line1:       string;    // House number + street
  line2?:      string;    // Flat/apartment, building name
  city:        string;    // Town or city
  county?:     string;    // County (optional in UK)
  postcode:    string;    // UK postcode e.g. SW1A 2AA — validated
  country:     'GB';
  // GPS derived from postcode via postcodes.io — never entered by user
  gpsLat:      number;
  gpsLng:      number;
}

export interface IGpsPoint {
  lat:        number;
  lng:        number;
  recordedAt: Date;
}

export interface IStatusEvent {
  status:    DeliveryStatus;
  changedBy: string;
  changedAt: Date;
  note?:     string;
  gpsLat?:   number;
  gpsLng?:   number;
}

// ─── UK GDPR Consent record ───────────────────────────────────
export interface IGdprConsent {
  consentGiven:     boolean;
  consentText:      string;    // Exact text shown to user at booking
  consentTimestamp: Date;
  ipAddress:        string;    // ICO requirement — record consent origin IP
  dataRetentionDays: number;   // Per ICO guidance — default 365 for repair records
}

// ─── Main DeliveryJob document ────────────────────────────────
export interface IDeliveryJob extends Document {
  _id: mongoose.Types.ObjectId;

  // Multi-tenancy (every query MUST scope to tenantId)
  tenantId:   mongoose.Types.ObjectId;
  ticketId?:  mongoose.Types.ObjectId;  // Null until ticket created on pickup
  customerId: mongoose.Types.ObjectId;
  driverId?:  mongoose.Types.ObjectId;

  jobType: DeliveryJobType;
  status:  DeliveryStatus;

  // UK address
  address: IUKAddress;

  // Booking
  preferredDate:    Date;
  timeSlot:         UKTimeSlot;
  bookedAt:         Date;
  bookedBy:         string;    // userId
  bookedByRole:     string;    // for audit — 'customer' | 'frontdesk' etc.

  // UK pricing — always GBP, always inc. VAT (20%)
  deliveryFeeExVat: number;    // e.g. 5.00
  vatAmount:        number;    // always deliveryFeeExVat * 0.20
  deliveryFeeIncVat: number;   // what customer pays
  currency:         'GBP';
  pricingModel:     PricingModel;
  vatRate:          0.20;      // UK standard rate — locked

  // Payment
  paymentMethod: UKPaymentMethod;
  isPaid:        boolean;
  paidAmount?:   number;       // GBP inc. VAT
  paymentReference?: string;   // Stripe PI id, PayPal order, etc.

  // Execution timestamps
  assignedAt?:  Date;
  departedAt?:  Date;
  arrivedAt?:   Date;
  completedAt?: Date;

  // Evidence
  conditionPhotoUrls: string[];
  proofPhotoUrl?:     string;
  customerSignature?: string;   // Base64 or Cloudinary URL
  deviceConditionNotes?: string;

  // GPS (live stored in Redis; snapshotted to Mongo on completion)
  gpsTrail:      IGpsPoint[];
  statusHistory: IStatusEvent[];

  // Zone reference
  serviceZoneId?: string;
  distanceKm:     number;

  // UK GDPR compliance (ICO requirement)
  gdprConsent:    IGdprConsent;
  // Data retention — ICO guidance: must not keep personal data beyond need
  retainUntil:    Date;         // Set at creation: today + 365 days
  anonymisedAt?:  Date;         // Set when right-to-erasure exercised

  // Notes
  customerNotes?: string;
  internalNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────
const ukAddressSchema = new Schema<IUKAddress>(
  {
    line1:    { type: String, required: true, trim: true, maxlength: 255 },
    line2:    { type: String, trim: true, maxlength: 255 },
    city:     { type: String, required: true, trim: true, maxlength: 100 },
    county:   { type: String, trim: true, maxlength: 100 },
    postcode: {
      type:      String,
      required:  true,
      trim:      true,
      uppercase: true,
      // Royal Mail postcode format
      match: [
        /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
        'Invalid UK postcode format',
      ],
    },
    country: { type: String, enum: ['GB'], default: 'GB' },
    gpsLat:  { type: Number, required: true },
    gpsLng:  { type: Number, required: true },
  },
  { _id: false }
);

const gpsPointSchema = new Schema<IGpsPoint>(
  {
    lat:        { type: Number, required: true },
    lng:        { type: Number, required: true },
    recordedAt: { type: Date,   required: true, default: Date.now },
  },
  { _id: false }
);

const statusEventSchema = new Schema<IStatusEvent>(
  {
    status:    { type: String, enum: Object.values(DeliveryStatus), required: true },
    changedBy: { type: String, required: true },
    changedAt: { type: Date,   required: true, default: Date.now },
    note:      { type: String, maxlength: 500 },
    gpsLat:    { type: Number },
    gpsLng:    { type: Number },
  },
  { _id: false }
);

const gdprConsentSchema = new Schema<IGdprConsent>(
  {
    consentGiven:      { type: Boolean, required: true },
    consentText:       { type: String,  required: true },
    consentTimestamp:  { type: Date,    required: true, default: Date.now },
    ipAddress:         { type: String,  required: true },
    dataRetentionDays: { type: Number,  default: 365 },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────
const deliveryJobSchema = new Schema<IDeliveryJob>(
  {
    tenantId:   { type: Schema.Types.ObjectId, required: true, index: true },
    ticketId:   { type: Schema.Types.ObjectId, ref: 'Ticket', index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    driverId:   { type: Schema.Types.ObjectId, ref: 'User', index: true },

    jobType: { type: String, enum: Object.values(DeliveryJobType), required: true },
    status:  { type: String, enum: Object.values(DeliveryStatus),  default: DeliveryStatus.PENDING, index: true },

    address: { type: ukAddressSchema, required: true },

    preferredDate: { type: Date,   required: true },
    timeSlot:      { type: String, enum: Object.values(UKTimeSlot), required: true },
    bookedAt:      { type: Date,   default: Date.now },
    bookedBy:      { type: String, required: true },
    bookedByRole:  { type: String, required: true },

    // GBP pricing — always stored inc. and ex. VAT separately
    deliveryFeeExVat:  { type: Number, required: true, default: 0 },
    vatAmount:         { type: Number, required: true, default: 0 },
    deliveryFeeIncVat: { type: Number, required: true, default: 0 },
    currency:          { type: String, enum: ['GBP'], default: 'GBP' },
    pricingModel:      { type: String, enum: Object.values(PricingModel), required: true },
    vatRate:           { type: Number, default: 0.20 },

    paymentMethod:    { type: String, enum: Object.values(UKPaymentMethod), required: true },
    isPaid:           { type: Boolean, default: false },
    paidAmount:       { type: Number },
    paymentReference: { type: String },

    assignedAt:  { type: Date },
    departedAt:  { type: Date },
    arrivedAt:   { type: Date },
    completedAt: { type: Date },

    conditionPhotoUrls:   { type: [String], default: [] },
    proofPhotoUrl:        { type: String },
    customerSignature:    { type: String },
    deviceConditionNotes: { type: String, maxlength: 1000 },

    gpsTrail:      { type: [gpsPointSchema],   default: [] },
    statusHistory: { type: [statusEventSchema], default: [] },

    serviceZoneId: { type: String },
    distanceKm:    { type: Number, default: 0 },

    // UK GDPR — mandatory fields
    gdprConsent:   { type: gdprConsentSchema, required: true },
    retainUntil:   { type: Date, required: true },
    anonymisedAt:  { type: Date },

    customerNotes: { type: String, maxlength: 500 },
    internalNotes: { type: String, maxlength: 1000 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Compound indexes ─────────────────────────────────────────
deliveryJobSchema.index({ tenantId: 1, driverId: 1, status: 1 });
deliveryJobSchema.index({ tenantId: 1, preferredDate: 1, status: 1 });
deliveryJobSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
// ICO compliance: find records due for anonymisation
deliveryJobSchema.index({ retainUntil: 1 });

export const DeliveryJobModel = mongoose.model<IDeliveryJob>('delivery_jobs', deliveryJobSchema);
