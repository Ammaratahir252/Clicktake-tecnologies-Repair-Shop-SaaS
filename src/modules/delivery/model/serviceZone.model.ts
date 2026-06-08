// ============================================================
// DibnowRepairSaaS — Module 9: Doorstep Delivery & Logistics
// UK Service Zone Model
//
// UK-specific design:
//  - Zones defined by postcode districts (e.g. SW1, EC2, M1)
//    rather than GPS polygons alone — matches how UK logistics works
//  - Supports all 4 pricing models: flat/per-km/free-above/peak-off-peak
//  - Operating hours use UK timezone (Europe/London) — BST/GMT aware
//  - GBP only — VAT always stored separately
// ============================================================

import mongoose, { Document, Schema } from 'mongoose';
import { PricingModel } from './delivery.model';

export interface IPeakPricing {
  peakFeeExVat:    number;   // e.g. 8.00 (weekday evening / Saturday)
  offPeakFeeExVat: number;   // e.g. 5.00 (weekday daytime)
  peakHoursStart:  string;   // "17:00"
  peakHoursEnd:    string;   // "20:00"
  peakDays:        number[]; // 0=Sun … 6=Sat — e.g. [5,6] = weekend
}

export interface IServiceZone extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId:  mongoose.Types.ObjectId;
  name:      string;          // e.g. "Central London", "Manchester City Centre"
  isActive:  boolean;

  // UK postcode districts covered (e.g. ['SW1', 'SW3', 'SW5', 'EC1'])
  postcodeDistricts: string[];

  // GeoJSON polygon as fallback for GPS-based zone check
  // postcodeDistricts is primary; polygon used for check-zone API
  geoJson?: {
    type:        'Polygon';
    coordinates: number[][][];
  };

  // Pricing — GBP, always ex. VAT (VAT added at invoice time)
  pricingModel:    PricingModel;
  baseFeeExVat:    number;   // Used by all models as starting point
  pricePerKm?:     number;   // PER_KM model only
  freeAboveGbp?:   number;   // FREE_ABOVE model — invoice value threshold
  peakPricing?:    IPeakPricing; // PEAK_OFF_PEAK model
  maxDistanceKm:   number;

  vatRate:         0.20;     // UK standard rate — locked
  currency:        'GBP';

  // Operational
  estimatedPickupMinutes: number;
  operatingHours: {
    open:     string;  // "08:00"
    close:    string;  // "20:00"
    timezone: string;  // Always "Europe/London" — BST/GMT auto-handled
  };
  operatingDays:     number[];  // [1,2,3,4,5] = Mon–Fri
  maxConcurrentJobs: number;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const peakPricingSchema = new Schema<IPeakPricing>(
  {
    peakFeeExVat:    { type: Number, required: true },
    offPeakFeeExVat: { type: Number, required: true },
    peakHoursStart:  { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    peakHoursEnd:    { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    peakDays:        { type: [Number], required: true },
  },
  { _id: false }
);

const serviceZoneSchema = new Schema<IServiceZone>(
  {
    tenantId:  { type: Schema.Types.ObjectId, required: true, index: true },
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    isActive:  { type: Boolean, default: true },

    // Royal Mail postcode districts — uppercase enforced
    postcodeDistricts: {
      type: [String],
      required: true,
      set: (arr: string[]) => arr.map((d) => d.trim().toUpperCase()),
    },

    geoJson: {
      type:        { type: String, enum: ['Polygon'] },
      coordinates: { type: [[[Number]]] },
    },

    pricingModel:    { type: String, enum: Object.values(PricingModel), required: true },
    baseFeeExVat:    { type: Number, required: true, default: 0, min: 0 },
    pricePerKm:      { type: Number, min: 0 },
    freeAboveGbp:    { type: Number, min: 0 },
    peakPricing:     { type: peakPricingSchema },

    maxDistanceKm:   { type: Number, required: true, default: 10 },
    vatRate:         { type: Number, default: 0.20 },
    currency:        { type: String, enum: ['GBP'], default: 'GBP' },

    estimatedPickupMinutes: { type: Number, default: 60 },
    operatingHours: {
      open:     { type: String, default: '08:00' },
      close:    { type: String, default: '20:00' },
      timezone: { type: String, default: 'Europe/London' },
    },
    operatingDays:     { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon–Fri default
    maxConcurrentJobs: { type: Number, default: 15 },

    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 2dsphere index for GPS-based zone check fallback
serviceZoneSchema.index({ 'geoJson': '2dsphere' }, { sparse: true });
serviceZoneSchema.index({ tenantId: 1, isActive: 1 });

export const ServiceZoneModel = mongoose.model<IServiceZone>('service_zones', serviceZoneSchema);
