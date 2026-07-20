import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';
import {
  uploadImage,
  destroyImage,
  publicIdFromUrl,
  CloudinaryConfigError,
} from '@/lib/uploads/cloudinary';

const ALLOWED_FIELDS = ['logoUrl', 'faviconUrl', 'loginBackgroundUrl'] as const;
type BrandingField = (typeof ALLOWED_FIELDS)[number];

/** logoUrl → logoPublicId, faviconUrl → faviconPublicId, loginBackgroundUrl → loginBackgroundPublicId */
function publicIdField(field: BrandingField): string {
  return `${field.replace(/Url$/, '')}PublicId`;
}

// POST /api/admin/branding/upload — multipart form: { file, field }
// Uploads to Cloudinary (serverless-safe permanent storage — the old local-disk
// approach broke in production where the filesystem is read-only), updates
// PlatformSettings[field] to the returned secure URL, stores the public_id
// alongside it, and deletes the field's previous Cloudinary file so re-uploads
// don't leak orphans. Enforces Settings > Storage's Max Upload Size and Allowed
// File Types. Legacy `/uploads/...` values are simply cleared — there is no
// cloud file behind them to delete.
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const field = String(form.get('field') || '') as BrandingField;

    if (!file) return sendResponse(false, 'No file provided', null, 400);
    if (!ALLOWED_FIELDS.includes(field)) return sendResponse(false, 'Invalid field', null, 400);

    const settings = await PlatformSettings.findOne()
      .select('maxUploadSizeMb allowedFileTypes logoPublicId faviconPublicId loginBackgroundPublicId logoUrl faviconUrl loginBackgroundUrl')
      .lean() as any;
    const maxBytes = (settings?.maxUploadSizeMb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return sendResponse(false, `File exceeds the configured max upload size (${settings?.maxUploadSizeMb ?? 10}MB)`, null, 400);
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const configuredAllowed: string[] = settings?.allowedFileTypes ?? ['jpg', 'jpeg', 'png', 'webp'];
    // Favicons need ico/svg regardless of the platform's general upload policy —
    // that policy is aimed at tenant-facing content images, not this technical requirement.
    const allowed = field === 'faviconUrl' ? Array.from(new Set([...configuredAllowed, 'ico', 'svg', 'png'])) : configuredAllowed;
    if (!allowed.includes(ext)) {
      return sendResponse(false, `File type ".${ext}" isn't in the allowed list (${allowed.join(', ')})`, null, 400);
    }

    const uploaded = await uploadImage(file, 'branding');

    // Remove the previous file for this field (stored publicId, or derived from
    // an older Cloudinary URL saved before publicIds were tracked).
    const pidField = publicIdField(field);
    await destroyImage(settings?.[pidField] || publicIdFromUrl(settings?.[field]));

    await PlatformSettings.findOneAndUpdate(
      {},
      { $set: { [field]: uploaded.url, [pidField]: uploaded.publicId } },
      { upsert: true }
    );

    return sendResponse(true, 'Uploaded', { url: uploaded.url, publicId: uploaded.publicId });
  } catch (err: any) {
    if (err instanceof CloudinaryConfigError) return sendResponse(false, err.message, null, 503);
    return sendResponse(false, err.message || 'Upload failed', null, 500);
  }
}

// DELETE /api/admin/branding/upload — body: { field }. Removes the Cloudinary
// file (if any) and clears PlatformSettings[field] back to empty.
export async function DELETE(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json().catch(() => ({}));
    const field = String(body.field || '') as BrandingField;
    if (!ALLOWED_FIELDS.includes(field)) return sendResponse(false, 'Invalid field', null, 400);

    const pidField = publicIdField(field);
    const settings = await PlatformSettings.findOne().select(`${field} ${pidField}`).lean() as any;
    await destroyImage(settings?.[pidField] || publicIdFromUrl(settings?.[field]));

    await PlatformSettings.findOneAndUpdate(
      {},
      { $set: { [field]: '', [pidField]: '' } },
      { upsert: true }
    );

    return sendResponse(true, 'Removed', { url: '' });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Failed to remove', null, 500);
  }
}
