// ============================================================
// DibnowRepairSaaS — Module 9: UK Delivery Validators
// Zod schemas — UK-specific rules throughout
// ============================================================

import { z } from 'zod';
import {
  DeliveryJobType,
  DeliveryStatus,
  UKPaymentMethod,
  UKTimeSlot,
  PricingModel,
} from '../model/delivery.model';

// ─── Primitives ───────────────────────────────────────────────
const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID');

// UK postcode — Royal Mail format with flexible spacing
const ukPostcodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    'Invalid UK postcode. Example formats: SW1A 2AA, M1 1AE, EC2V 8RT'
  );

// ─── UK Address ───────────────────────────────────────────────
const ukAddressSchema = z.object({
  line1:    z.string().min(3).max(255).trim(),
  line2:    z.string().max(255).trim().optional(),
  city:     z.string().min(2).max(100).trim(),
  county:   z.string().max(100).trim().optional(),
  postcode: ukPostcodeSchema,
  country:  z.literal('GB').default('GB'),
  // GPS resolved from postcode — do NOT accept from client to prevent spoofing
  // Service layer resolves these from postcodes.io
});

// ─── UK GDPR Consent (mandatory for all delivery bookings) ───
const gdprConsentSchema = z.object({
  consentGiven: z.literal(true, {
    errorMap: () => ({
      message: 'You must accept the data processing terms to book a collection.',
    }),
  }),
  // The consent text is sent back from the client verbatim
  // so we can store exactly what the user agreed to (ICO best practice)
  consentText: z
    .string()
    .min(10, 'Consent text too short')
    .max(2000, 'Consent text too long'),
});

// ─── Book a Doorstep Job ──────────────────────────────────────
export const bookDeliveryJobSchema = z.object({
  customerId: mongoIdSchema,
  ticketId:   mongoIdSchema.optional(),

  jobType: z.nativeEnum(DeliveryJobType),

  address: ukAddressSchema,

  // Must be a future date
  preferredDate: z
    .string()
    .datetime({ message: 'Must be ISO 8601 datetime, e.g. 2026-07-15T09:00:00Z' })
    .refine(
      (d) => new Date(d) > new Date(),
      'Preferred date must be in the future'
    ),

  timeSlot: z.nativeEnum(UKTimeSlot),

  paymentMethod: z.nativeEnum(UKPaymentMethod),

  // Invoice value in GBP — needed for FREE_ABOVE pricing model
  invoiceValueGbp: z.number().nonnegative().optional(),

  // UK GDPR — mandatory
  gdprConsent: gdprConsentSchema,

  customerNotes: z.string().max(500).optional(),
});

// ─── Assign Driver ────────────────────────────────────────────
export const assignDriverSchema = z.object({
  driverId: mongoIdSchema,
  note:     z.string().max(300).optional(),
});

// ─── Update Status ────────────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  note:   z.string().max(300).optional(),
});

// ─── GPS Ping ─────────────────────────────────────────────────
export const gpsPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ─── Complete Job (proof of delivery) ────────────────────────
export const completeJobSchema = z.object({
  proofPhotoUrl:        z.string().url().optional(),
  customerSignature:    z.string().max(50000).optional(),
  deviceConditionNotes: z.string().max(1000).optional(),
  paymentCollected:     z.number().nonnegative().optional(),
  paymentReference:     z.string().max(200).optional(),
});

// ─── Create / Update Service Zone ────────────────────────────
export const createServiceZoneSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  isActive: z.boolean().default(true),

  // At least one postcode district required
  postcodeDistricts: z
    .array(z.string().trim().toUpperCase().min(2).max(6))
    .min(1, 'At least one postcode district required (e.g. SW1, M1, EC2V)'),

  geoJson: z
    .object({
      type:        z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
    })
    .optional(),

  pricingModel:  z.nativeEnum(PricingModel),
  baseFeeExVat:  z.number().nonnegative().default(0),
  pricePerKm:    z.number().nonnegative().optional(),
  freeAboveGbp:  z.number().nonnegative().optional(),

  peakPricing: z
    .object({
      peakFeeExVat:    z.number().nonnegative(),
      offPeakFeeExVat: z.number().nonnegative(),
      peakHoursStart:  z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
      peakHoursEnd:    z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
      peakDays:        z.array(z.number().int().min(0).max(6)),
    })
    .optional(),

  maxDistanceKm: z.number().positive().max(100).default(10),

  estimatedPickupMinutes: z.number().int().positive().default(60),

  operatingHours: z
    .object({
      open:     z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
      close:    z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
      timezone: z.string().default('Europe/London'),
    })
    .default({ open: '08:00', close: '20:00', timezone: 'Europe/London' }),

  // Mon–Fri default for UK repair shops
  operatingDays:     z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  maxConcurrentJobs: z.number().int().positive().default(15),
}).refine(
  (data) => {
    // PEAK_OFF_PEAK requires peakPricing config
    if (data.pricingModel === PricingModel.PEAK_OFF_PEAK && !data.peakPricing) {
      return false;
    }
    // FREE_ABOVE requires freeAboveGbp threshold
    if (data.pricingModel === PricingModel.FREE_ABOVE && data.freeAboveGbp === undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'PEAK_OFF_PEAK model requires peakPricing; FREE_ABOVE model requires freeAboveGbp',
  }
);

// ─── List Jobs query params ────────────────────────────────────
export const listJobsQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  status:   z.nativeEnum(DeliveryStatus).optional(),
  jobType:  z.nativeEnum(DeliveryJobType).optional(),
  driverId: mongoIdSchema.optional(),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  postcode: ukPostcodeSchema.optional(),
});

// ─── Zone check query ─────────────────────────────────────────
export const checkZoneQuerySchema = z.object({
  postcode: ukPostcodeSchema,
  // Invoice value optional — only needed for FREE_ABOVE pricing display
  invoiceValueGbp: z.coerce.number().nonnegative().optional(),
});

// ─── UK GDPR Right to Erasure request ─────────────────────────
export const erasureRequestSchema = z.object({
  customerId: mongoIdSchema,
  reason:     z.string().max(500).optional(),
});

// ─── Zod error formatter ──────────────────────────────────────
export const formatZodErrors = (error: z.ZodError): Record<string, string> =>
  error.errors.reduce<Record<string, string>>((acc, e) => {
    acc[e.path.join('.')] = e.message;
    return acc;
  }, {});
