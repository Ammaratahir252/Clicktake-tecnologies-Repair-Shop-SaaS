// src/lib/uploads/cloudinary.ts
// Cloudinary storage for every image upload in the app (platform branding, shop
// branding, ticket photos, proof-of-delivery). Uses Cloudinary's signed REST
// upload API directly via fetch — no SDK dependency — because serverless hosts
// (Vercel) have a read-only filesystem, so images must live in cloud storage,
// never under public/uploads.
//
// Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.

import crypto from 'crypto';

export class CloudinaryConfigError extends Error {
  constructor() {
    super(
      'Image storage is not configured on the server. Set CLOUDINARY_CLOUD_NAME, ' +
      'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the environment.'
    );
    this.name = 'CloudinaryConfigError';
  }
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new CloudinaryConfigError();
  return { cloudName, apiKey, apiSecret };
}

/**
 * Cloudinary request signature: SHA-1 of the non-file params sorted
 * alphabetically and joined as `key=value&…`, with the API secret appended.
 */
export function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

export interface UploadedImage {
  url: string;      // permanent HTTPS delivery URL (secure_url)
  publicId: string; // Cloudinary public_id — needed to delete/replace later
  bytes: number;
}

/**
 * Uploads one image to Cloudinary under the given folder (e.g. "branding",
 * "shops/<tenantId>", "tickets/<tenantId>"). Throws CloudinaryConfigError when
 * credentials are missing and a plain Error with Cloudinary's message on API
 * failure.
 */
export async function uploadImage(file: File, folder: string): Promise<UploadedImage> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams({ folder, timestamp }, apiSecret);

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  form.append('timestamp', String(timestamp));
  form.append('api_key', apiKey);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || `Image upload failed (Cloudinary ${res.status})`);
  }
  return { url: data.secure_url, publicId: data.public_id, bytes: data.bytes ?? 0 };
}

/**
 * Best-effort delete of a previously uploaded image. Never throws — a leaked
 * orphan file must not fail the user-facing replace/remove operation.
 */
export async function destroyImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId) return;
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signCloudinaryParams({ public_id: publicId, timestamp }, apiSecret);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', apiKey);
    form.append('signature', signature);

    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: form,
    });
  } catch {
    // Config missing or network error — nothing to clean up.
  }
}

/**
 * Derives the public_id from a Cloudinary delivery URL, for records that store
 * only the URL (e.g. team-member photos saved before/without a publicId field).
 * Returns null for non-Cloudinary URLs (including legacy /uploads/... paths).
 */
export function publicIdFromUrl(url: string | null | undefined): string | null {
  if (!url || !/^https:\/\/res\.cloudinary\.com\//.test(url)) return null;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let rest = url.slice(idx + marker.length);
  rest = rest.replace(/^v\d+\//, '');           // strip version segment
  rest = rest.replace(/\.[a-zA-Z0-9]+$/, '');   // strip file extension
  return rest || null;
}

/** Legacy local-disk URL from the pre-Cloudinary era (`/uploads/...`). */
export function isLegacyLocalUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith('/uploads/');
}
