// ============================================================
// DibnowRepairSaaS — Module 9: UK Delivery Pricing Engine
//
// Handles all 4 pricing models:
//   FLAT_POSTCODE  — fixed fee per postcode district
//   PER_KM         — base fee + per-km surcharge
//   FREE_ABOVE     — free delivery if invoice exceeds threshold
//   PEAK_OFF_PEAK  — different rates by time of day / weekday vs weekend
//
// UK VAT rules:
//   Standard rate: 20% on all delivery fees
//   Prices always stored ex-VAT; presented inc-VAT
//   VAT amount calculated as: exVat * 0.20 (rounded to 2dp)
//   ICO/HMRC: keep ex-VAT and VAT separate in every record
// ============================================================

import { IServiceZone, IPeakPricing } from '../model/serviceZone.model';
import { PricingModel } from '../model/delivery.model';

const UK_VAT_RATE = 0.20;

export interface DeliveryPriceResult {
  deliveryFeeExVat:  number;   // e.g. 5.00
  vatAmount:         number;   // e.g. 1.00
  deliveryFeeIncVat: number;   // e.g. 6.00
  vatRate:           number;   // 0.20
  currency:          'GBP';
  pricingModel:      PricingModel;
  isFree:            boolean;
}

// ─── Add VAT to ex-VAT amount ────────────────────────────────
const addVat = (exVat: number): { exVat: number; vat: number; incVat: number } => {
  const vat   = Math.round(exVat * UK_VAT_RATE * 100) / 100;
  const incVat = Math.round((exVat + vat) * 100) / 100;
  return { exVat: Math.round(exVat * 100) / 100, vat, incVat };
};

// ─── Determine if time is peak ────────────────────────────────
const isInPeakPeriod = (
  date: Date,
  peakPricing: IPeakPricing,
  timezone: string = 'Europe/London'
): boolean => {
  // Get local UK time (handles BST/GMT automatically via Intl)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour:     '2-digit',
    minute:   '2-digit',
    weekday:  'short',
    hour12:   false,
  });
  const parts = formatter.formatToParts(date);
  const hour    = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute  = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(
    parts.find((p) => p.type === 'weekday')?.value || 'Mon'
  );

  const dayIsPeak = peakPricing.peakDays.includes(weekday);

  const [peakStartH, peakStartM] = peakPricing.peakHoursStart.split(':').map(Number);
  const [peakEndH,   peakEndM]   = peakPricing.peakHoursEnd.split(':').map(Number);
  const currentMins = hour * 60 + minute;
  const peakStart   = peakStartH * 60 + peakStartM;
  const peakEnd     = peakEndH   * 60 + peakEndM;
  const timeIsPeak  = currentMins >= peakStart && currentMins < peakEnd;

  return dayIsPeak || timeIsPeak;
};

// ─── Main pricing calculator ──────────────────────────────────
export const calculateDeliveryFee = (params: {
  zone:            IServiceZone;
  distanceKm:      number;
  invoiceValueGbp?: number;  // Required for FREE_ABOVE model
  preferredDate?:  Date;     // Required for PEAK_OFF_PEAK model
}): DeliveryPriceResult => {
  const { zone, distanceKm, invoiceValueGbp, preferredDate } = params;

  let exVat = zone.baseFeeExVat;

  switch (zone.pricingModel) {

    // ── Model 1: Flat fee per postcode district ───────────────
    case PricingModel.FLAT_POSTCODE:
      exVat = zone.baseFeeExVat;
      break;

    // ── Model 2: Base + per-km surcharge ─────────────────────
    case PricingModel.PER_KM:
      exVat = zone.baseFeeExVat + distanceKm * (zone.pricePerKm || 0);
      exVat = Math.round(exVat * 100) / 100;
      break;

    // ── Model 3: Free above invoice threshold ─────────────────
    case PricingModel.FREE_ABOVE:
      if (
        zone.freeAboveGbp !== undefined &&
        invoiceValueGbp !== undefined &&
        invoiceValueGbp >= zone.freeAboveGbp
      ) {
        const { exVat: freeExVat, vat, incVat } = addVat(0);
        return {
          deliveryFeeExVat:  freeExVat,
          vatAmount:         vat,
          deliveryFeeIncVat: incVat,
          vatRate:           UK_VAT_RATE,
          currency:          'GBP',
          pricingModel:      PricingModel.FREE_ABOVE,
          isFree:            true,
        };
      }
      // Invoice below threshold — charge base fee
      exVat = zone.baseFeeExVat;
      break;

    // ── Model 4: Peak / off-peak pricing ─────────────────────
    case PricingModel.PEAK_OFF_PEAK:
      if (zone.peakPricing && preferredDate) {
        const peak = isInPeakPeriod(
          preferredDate,
          zone.peakPricing,
          zone.operatingHours.timezone
        );
        exVat = peak
          ? zone.peakPricing.peakFeeExVat
          : zone.peakPricing.offPeakFeeExVat;
      } else {
        exVat = zone.baseFeeExVat;
      }
      break;

    default:
      exVat = zone.baseFeeExVat;
  }

  const { exVat: finalExVat, vat, incVat } = addVat(exVat);
  return {
    deliveryFeeExVat:  finalExVat,
    vatAmount:         vat,
    deliveryFeeIncVat: incVat,
    vatRate:           UK_VAT_RATE,
    currency:          'GBP',
    pricingModel:      zone.pricingModel,
    isFree:            false,
  };
};
