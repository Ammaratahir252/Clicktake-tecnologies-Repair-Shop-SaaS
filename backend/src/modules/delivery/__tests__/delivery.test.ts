// ============================================================
// DibnowRepairSaaS M9 — Delivery Module Tests
// Run: npm test
// ============================================================

import { formatPostcode, isValidUKPostcode, extractPostcodeDistrict, haversineKm } from '../utils/postcode.utils';
import { calculateDeliveryFee } from '../utils/pricing.utils';
import { PricingModel, DeliveryStatus, DeliveryJobType, UKTimeSlot, UKPaymentMethod } from '../model/delivery.model';
import { bookDeliveryJobSchema, gpsPingSchema, updateStatusSchema, createServiceZoneSchema, checkZoneQuerySchema } from '../validators/delivery.validators';

// ─── Postcode utilities ───────────────────────────────────────
describe('postcode utils', () => {
  describe('formatPostcode', () => {
    it('formats with correct spacing', () => {
      expect(formatPostcode('sw1a2aa')).toBe('SW1A 2AA');
      expect(formatPostcode('M11AE')).toBe('M1 1AE');
      expect(formatPostcode('EC2V 8RT')).toBe('EC2V 8RT');
      expect(formatPostcode('  ec1a1bb  ')).toBe('EC1A 1BB');
    });
  });

  describe('isValidUKPostcode', () => {
    it('accepts valid postcodes', () => {
      expect(isValidUKPostcode('SW1A 2AA')).toBe(true);
      expect(isValidUKPostcode('M1 1AE')).toBe(true);
      expect(isValidUKPostcode('EC2V 8RT')).toBe(true);
      expect(isValidUKPostcode('BT1 1AA')).toBe(true);  // Northern Ireland
      expect(isValidUKPostcode('W1A 0AX')).toBe(true);
    });

    it('rejects invalid postcodes', () => {
      expect(isValidUKPostcode('INVALID')).toBe(false);
      expect(isValidUKPostcode('12345')).toBe(false);
      expect(isValidUKPostcode('')).toBe(false);
    });
  });

  describe('extractPostcodeDistrict', () => {
    it('extracts the outward code correctly', () => {
      expect(extractPostcodeDistrict('SW1A 2AA')).toBe('SW1A');
      expect(extractPostcodeDistrict('M1 1AE')).toBe('M1');
      expect(extractPostcodeDistrict('EC2V 8RT')).toBe('EC2V');
      expect(extractPostcodeDistrict('W1A 0AX')).toBe('W1A');
    });
  });

  describe('haversineKm', () => {
    it('returns ~0 for same coordinates', () => {
      expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 1);
    });

    it('calculates London to Manchester (~262km)', () => {
      const dist = haversineKm(51.5074, -0.1278, 53.4808, -2.2426);
      expect(dist).toBeGreaterThan(250);
      expect(dist).toBeLessThan(275);
    });

    it('returns positive for reversed coords', () => {
      const d1 = haversineKm(51.5, -0.1, 51.6, -0.2);
      const d2 = haversineKm(51.6, -0.2, 51.5, -0.1);
      expect(d1).toBeCloseTo(d2, 3);
    });
  });
});

// ─── Pricing engine ───────────────────────────────────────────
describe('pricing engine', () => {
  const baseZone = {
    pricingModel:  PricingModel.FLAT_POSTCODE,
    baseFeeExVat:  5.00,
    maxDistanceKm: 15,
    vatRate:       0.20 as 0.20,
    currency:      'GBP' as 'GBP',
    operatingHours: { open: '08:00', close: '20:00', timezone: 'Europe/London' },
    operatingDays:  [1,2,3,4,5],
  } as any;

  describe('FLAT_POSTCODE', () => {
    it('charges flat fee + 20% VAT', () => {
      const result = calculateDeliveryFee({ zone: baseZone, distanceKm: 5 });
      expect(result.deliveryFeeExVat).toBe(5.00);
      expect(result.vatAmount).toBe(1.00);
      expect(result.deliveryFeeIncVat).toBe(6.00);
      expect(result.isFree).toBe(false);
      expect(result.currency).toBe('GBP');
    });

    it('handles zero fee (free collection zone)', () => {
      const freeZone = { ...baseZone, baseFeeExVat: 0 };
      const result = calculateDeliveryFee({ zone: freeZone, distanceKm: 2 });
      expect(result.deliveryFeeExVat).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.deliveryFeeIncVat).toBe(0);
    });
  });

  describe('PER_KM', () => {
    it('charges base + distance * per-km rate + VAT', () => {
      const perKmZone = { ...baseZone, pricingModel: PricingModel.PER_KM, baseFeeExVat: 2.00, pricePerKm: 0.50 };
      const result = calculateDeliveryFee({ zone: perKmZone, distanceKm: 10 });
      // exVat = 2 + (10 * 0.5) = 7.00
      expect(result.deliveryFeeExVat).toBe(7.00);
      expect(result.vatAmount).toBe(1.40);
      expect(result.deliveryFeeIncVat).toBe(8.40);
    });
  });

  describe('FREE_ABOVE', () => {
    const freeAboveZone = {
      ...baseZone,
      pricingModel:  PricingModel.FREE_ABOVE,
      baseFeeExVat:  4.00,
      freeAboveGbp:  50,
    };

    it('charges full fee when invoice below threshold', () => {
      const result = calculateDeliveryFee({ zone: freeAboveZone, distanceKm: 3, invoiceValueGbp: 30 });
      expect(result.deliveryFeeExVat).toBe(4.00);
      expect(result.isFree).toBe(false);
    });

    it('gives free delivery when invoice meets threshold', () => {
      const result = calculateDeliveryFee({ zone: freeAboveZone, distanceKm: 3, invoiceValueGbp: 50 });
      expect(result.deliveryFeeExVat).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.deliveryFeeIncVat).toBe(0);
      expect(result.isFree).toBe(true);
    });

    it('gives free delivery when invoice exceeds threshold', () => {
      const result = calculateDeliveryFee({ zone: freeAboveZone, distanceKm: 3, invoiceValueGbp: 200 });
      expect(result.isFree).toBe(true);
    });
  });

  describe('PEAK_OFF_PEAK', () => {
    const peakZone = {
      ...baseZone,
      pricingModel: PricingModel.PEAK_OFF_PEAK,
      baseFeeExVat: 5.00,
      peakPricing: {
        peakFeeExVat:    8.00,
        offPeakFeeExVat: 4.00,
        peakHoursStart:  '17:00',
        peakHoursEnd:    '20:00',
        peakDays:        [5, 6], // Fri + Sat
      },
    };

    it('charges off-peak fee during off-peak hours', () => {
      // Wednesday 10:00 AM UTC (off-peak hours, off-peak day)
      const offPeakDate = new Date('2026-06-10T10:00:00Z'); // Wednesday
      const result = calculateDeliveryFee({ zone: peakZone, distanceKm: 0, preferredDate: offPeakDate });
      expect(result.deliveryFeeExVat).toBe(4.00);
    });

    it('charges peak fee on peak day', () => {
      // Saturday
      const peakDate = new Date('2026-06-13T14:00:00Z');
      const result = calculateDeliveryFee({ zone: peakZone, distanceKm: 0, preferredDate: peakDate });
      expect(result.deliveryFeeExVat).toBe(8.00);
    });

    it('falls back to baseFeeExVat when no peakPricing config', () => {
      const missingPeak = { ...peakZone, peakPricing: undefined };
      const result = calculateDeliveryFee({ zone: missingPeak, distanceKm: 0, preferredDate: new Date() });
      expect(result.deliveryFeeExVat).toBe(5.00);
    });
  });

  describe('VAT calculation precision', () => {
    it('rounds to 2 decimal places (avoids floating point issues)', () => {
      const zone = { ...baseZone, baseFeeExVat: 3.33 };
      const result = calculateDeliveryFee({ zone, distanceKm: 0 });
      expect(result.vatAmount).toBe(0.67);
      expect(result.deliveryFeeIncVat).toBe(4.00);
    });
  });
});

// ─── Validators ───────────────────────────────────────────────
describe('booking validator', () => {
  const validBooking = {
    customerId:    '507f1f77bcf86cd799439011',
    jobType:       DeliveryJobType.PICKUP,
    address: {
      line1:    '10 Downing Street',
      city:     'London',
      postcode: 'SW1A 2AA',
      country:  'GB' as const,
    },
    preferredDate:  new Date(Date.now() + 86400000).toISOString(),
    timeSlot:       UKTimeSlot.MORNING,
    paymentMethod:  UKPaymentMethod.CASH,
    gdprConsent: {
      consentGiven: true as const,
      consentText:  'I agree to the processing of my personal data for this booking.',
    },
  };

  it('accepts a valid booking', () => {
    const result = bookDeliveryJobSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it('rejects past preferredDate', () => {
    const past = { ...validBooking, preferredDate: '2020-01-01T10:00:00Z' };
    const result = bookDeliveryJobSchema.safeParse(past);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain('future');
  });

  it('rejects invalid UK postcode', () => {
    const bad = { ...validBooking, address: { ...validBooking.address, postcode: 'NOTAPC' } };
    const result = bookDeliveryJobSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects missing GDPR consent', () => {
    const noGdpr = { ...validBooking, gdprConsent: { consentGiven: false, consentText: 'No' } };
    const result = bookDeliveryJobSchema.safeParse(noGdpr);
    expect(result.success).toBe(false);
  });

  it('rejects invalid mongo ID', () => {
    const badId = { ...validBooking, customerId: 'not-a-mongo-id' };
    const result = bookDeliveryJobSchema.safeParse(badId);
    expect(result.success).toBe(false);
  });
});

describe('GPS ping validator', () => {
  it('accepts valid UK coordinates', () => {
    expect(gpsPingSchema.safeParse({ lat: 51.5, lng: -0.1 }).success).toBe(true);
    expect(gpsPingSchema.safeParse({ lat: 53.48, lng: -2.24 }).success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    expect(gpsPingSchema.safeParse({ lat: 200, lng: 0 }).success).toBe(false);
    expect(gpsPingSchema.safeParse({ lat: 0, lng: -200 }).success).toBe(false);
  });

  it('rejects non-numeric values', () => {
    expect(gpsPingSchema.safeParse({ lat: 'abc', lng: 0 }).success).toBe(false);
  });
});

describe('status update validator', () => {
  it('accepts valid status values', () => {
    const result = updateStatusSchema.safeParse({ status: DeliveryStatus.EN_ROUTE });
    expect(result.success).toBe(true);
  });

  it('rejects unknown status', () => {
    const result = updateStatusSchema.safeParse({ status: 'flying' });
    expect(result.success).toBe(false);
  });

  it('accepts optional gps coordinates', () => {
    const result = updateStatusSchema.safeParse({ status: DeliveryStatus.ARRIVED, gpsLat: 51.5, gpsLng: -0.1 });
    expect(result.success).toBe(true);
  });
});

describe('service zone validator', () => {
  const validZone = {
    name:              'Central London',
    postcodeDistricts: ['SW1', 'SW3', 'EC1'],
    pricingModel:      PricingModel.FLAT_POSTCODE,
    baseFeeExVat:      5.00,
  };

  it('accepts a valid zone', () => {
    expect(createServiceZoneSchema.safeParse(validZone).success).toBe(true);
  });

  it('rejects PEAK_OFF_PEAK without peakPricing', () => {
    const invalid = { ...validZone, pricingModel: PricingModel.PEAK_OFF_PEAK };
    const result = createServiceZoneSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects FREE_ABOVE without freeAboveGbp', () => {
    const invalid = { ...validZone, pricingModel: PricingModel.FREE_ABOVE };
    const result = createServiceZoneSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts FREE_ABOVE with freeAboveGbp', () => {
    const valid = { ...validZone, pricingModel: PricingModel.FREE_ABOVE, freeAboveGbp: 50 };
    expect(createServiceZoneSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one postcode district', () => {
    const invalid = { ...validZone, postcodeDistricts: [] };
    const result = createServiceZoneSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('zone check query validator', () => {
  it('accepts valid postcode', () => {
    expect(checkZoneQuerySchema.safeParse({ postcode: 'SW1A 2AA' }).success).toBe(true);
  });

  it('rejects invalid postcode', () => {
    expect(checkZoneQuerySchema.safeParse({ postcode: '99999' }).success).toBe(false);
  });

  it('accepts optional invoiceValueGbp', () => {
    expect(checkZoneQuerySchema.safeParse({ postcode: 'M1 1AE', invoiceValueGbp: '75' }).success).toBe(true);
  });
});
