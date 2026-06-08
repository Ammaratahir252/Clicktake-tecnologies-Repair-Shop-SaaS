// ============================================================
// DibnowRepairSaaS — Module 9: UK Postcode Utilities
//
// Royal Mail postcode handling:
//  - Validates format with regex (fast, no external call)
//  - Resolves GPS coordinates via postcodes.io (free, no API key)
//  - Extracts postcode district for zone matching (e.g. "SW1A 2AA" → "SW1")
//  - Formats postcodes to Royal Mail standard (uppercase, correct spacing)
//
// postcodes.io is the UK government-backed open postcode API
// No API key required. Rate limit: 60 req/min (batching available)
// ============================================================

import axios from 'axios';
import { logger } from '../../../utils/logger';

const POSTCODES_IO = 'https://api.postcodes.io';

// Royal Mail postcode regex — covers all valid UK formats:
// AN NAA, ANN NAA, AAN NAA, AANN NAA, ANA NAA, AANA NAA
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export interface PostcodeInfo {
  postcode:         string;   // Formatted: "SW1A 2AA"
  district:         string;   // "SW1" — used for zone matching
  latitude:         number;
  longitude:        number;
  region:           string;   // "London"
  country:          string;   // "England"
  adminDistrict:    string;   // "City of Westminster"
}

// ─── 1. Format to Royal Mail standard ────────────────────────
export const formatPostcode = (raw: string): string => {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  const match   = cleaned.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/i);
  if (!match) return raw.trim().toUpperCase();
  // Insert standard single space: outward + inward
  return `${match[1]} ${match[2]}`;
};

// ─── 2. Validate format (regex only — no API call) ───────────
export const isValidUKPostcode = (postcode: string): boolean => {
  const formatted = formatPostcode(postcode);
  return UK_POSTCODE_REGEX.test(formatted);
};

// ─── 3. Extract district (outward code) ──────────────────────
// "SW1A 2AA" → "SW1A" (area + district, no sector/unit)
// Used to match against ServiceZone.postcodeDistricts[]
export const extractPostcodeDistrict = (postcode: string): string => {
  const formatted = formatPostcode(postcode);
  const match     = formatted.match(UK_POSTCODE_REGEX);
  if (!match) throw new Error(`Cannot extract district from: ${postcode}`);
  return match[1].toUpperCase(); // e.g. "SW1A", "EC2V", "M1"
};

// ─── 4. Lookup postcode via postcodes.io ─────────────────────
export const lookupPostcode = async (postcode: string): Promise<PostcodeInfo> => {
  const formatted = formatPostcode(postcode);

  try {
    const { data } = await axios.get(
      `${POSTCODES_IO}/postcodes/${encodeURIComponent(formatted)}`,
      { timeout: 5000 }
    );

    if (data.status !== 200 || !data.result) {
      throw new Error(`Postcode not found: ${formatted}`);
    }

    const r = data.result;
    return {
      postcode:      formatPostcode(r.postcode),
      district:      extractPostcodeDistrict(r.postcode),
      latitude:      r.latitude,
      longitude:     r.longitude,
      region:        r.region       || 'Unknown',
      country:       r.country      || 'England',
      adminDistrict: r.admin_district || 'Unknown',
    };
  } catch (error) {
    logger.warn('Postcode lookup failed', { postcode: formatted, error });
    throw new Error(
      `We couldn't verify postcode ${formatted}. Please check it's correct and try again.`
    );
  }
};

// ─── 5. Batch lookup (up to 100 postcodes per request) ───────
// Used for bulk zone-checking or import operations
export const batchLookupPostcodes = async (
  postcodes: string[]
): Promise<Map<string, PostcodeInfo>> => {
  const results = new Map<string, PostcodeInfo>();
  if (!postcodes.length) return results;

  // postcodes.io batch limit is 100
  const chunks = [];
  for (let i = 0; i < postcodes.length; i += 100) {
    chunks.push(postcodes.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const { data } = await axios.post(
        `${POSTCODES_IO}/postcodes`,
        { postcodes: chunk.map(formatPostcode) },
        { timeout: 10000 }
      );

      for (const item of data.result || []) {
        if (item.result) {
          const info: PostcodeInfo = {
            postcode:      formatPostcode(item.result.postcode),
            district:      extractPostcodeDistrict(item.result.postcode),
            latitude:      item.result.latitude,
            longitude:     item.result.longitude,
            region:        item.result.region        || 'Unknown',
            country:       item.result.country       || 'England',
            adminDistrict: item.result.admin_district || 'Unknown',
          };
          results.set(info.postcode, info);
        }
      }
    } catch (error) {
      logger.error('Batch postcode lookup failed', { error, chunk });
    }
  }

  return results;
};

// ─── 6. Haversine distance in km ─────────────────────────────
export const haversineKm = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
