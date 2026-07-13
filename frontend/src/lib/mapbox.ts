/**
 * lib/mapbox.ts
 *
 * Server-side helpers for the Global GPS module.
 * Wraps the Mapbox APIs used for:
 *   - Reverse geocoding a GPS point into a readable address (any country)
 *   - Calculating a driving route (distance, ETA, turn-by-turn geometry)
 *
 * Mapbox is used instead of a country-specific service (e.g. UK's postcodes.io)
 * because it works globally — UK, USA, Pakistan, anywhere — with no
 * country-specific parsing logic required.
 *
 * Get a free token: https://account.mapbox.com/access-tokens/
 * Free tier: 100,000 requests/month for both Geocoding and Directions — more
 * than enough for a small-to-mid size repair shop SaaS.
 */

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function assertToken() {
  if (!MAPBOX_TOKEN) {
    throw new Error(
      'Mapbox token missing. Set MAPBOX_TOKEN (or NEXT_PUBLIC_MAPBOX_TOKEN) in .env.local'
    );
  }
}

export interface ReverseGeocodeResult {
  address: string;
  city?: string;
  country?: string;
  postcode?: string;
}

/**
 * Converts lat/lng → a human-readable address. Works worldwide.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  assertToken();
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place,postcode&limit=1`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Mapbox reverse geocode failed: ${res.status}`);
  }
  const data = await res.json();
  const feature = data?.features?.[0];

  if (!feature) {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }

  const context: any[] = feature.context ?? [];
  const findCtx = (prefix: string) =>
    context.find((c: any) => c.id?.startsWith(prefix))?.text as string | undefined;

  return {
    address: feature.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: findCtx('place'),
    country: findCtx('country'),
    postcode: findCtx('postcode'),
  };
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat][]
  };
}

/**
 * Calculates a driving route between two points using Mapbox Directions API.
 * Returns total distance, ETA, and the route geometry for drawing on a map.
 */
export async function getDrivingRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  assertToken();
  const coords = `${originLng},${originLat};${destLng},${destLat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Mapbox directions failed: ${res.status}`);
  }
  const data = await res.json();
  const route = data?.routes?.[0];

  if (!route) {
    throw new Error('No route found between the given points');
  }

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
  };
}

/**
 * Haversine straight-line distance in meters — used as a fast, no-API-call
 * fallback (e.g. for geofencing "has the driver arrived?" checks, or when
 * the Mapbox token isn't configured yet).
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
