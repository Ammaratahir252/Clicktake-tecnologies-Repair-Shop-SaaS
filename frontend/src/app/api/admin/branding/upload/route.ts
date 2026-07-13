import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';
import { canAccess } from '@/lib/adminAccess';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'branding');
const ALLOWED_FIELDS = ['logoUrl', 'faviconUrl', 'loginBackgroundUrl'];

/** Deletes a previously-uploaded branding file from disk, given its stored `/uploads/branding/...`
 * URL. No-ops silently for anything else (external URL, already-empty, already-missing file). */
async function deleteBrandingFile(url: string | undefined): Promise<void> {
  if (!url || !url.startsWith('/uploads/branding/')) return;
  const filename = url.split('/').pop();
  if (!filename) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // File already gone or never existed — nothing to clean up.
  }
}

// POST /api/admin/branding/upload — multipart form: { file, field }
// Saves to public/uploads/branding (served directly by Next.js as a static asset),
// updates PlatformSettings[field] to the resulting URL, and returns it. This is a
// real local-disk upload — enforces Settings > Storage's Max Upload Size and
// Allowed File Types, since this is the first (and only, for now) real consumer
// of those two settings. Also deletes the field's previous file (if any) so
// re-uploads don't leak orphaned files on disk indefinitely.
export async function POST(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const field = String(form.get('field') || '');

    if (!file) return sendResponse(false, 'No file provided', null, 400);
    if (!ALLOWED_FIELDS.includes(field)) return sendResponse(false, 'Invalid field', null, 400);

    const settings = await PlatformSettings.findOne().select('maxUploadSizeMb allowedFileTypes logoUrl faviconUrl loginBackgroundUrl').lean() as any;
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

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${field}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

    const url = `/uploads/branding/${filename}`;
    await deleteBrandingFile(settings?.[field]);
    await PlatformSettings.findOneAndUpdate({}, { $set: { [field]: url } }, { upsert: true });

    return sendResponse(true, 'Uploaded', { url });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Upload failed', null, 500);
  }
}

// DELETE /api/admin/branding/upload — body: { field }. Removes the uploaded file from
// disk (if any) and clears PlatformSettings[field] back to empty.
export async function DELETE(req: NextRequest) {
  if (!canAccess(req, 'settings')) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const body = await req.json().catch(() => ({}));
    const field = String(body.field || '');
    if (!ALLOWED_FIELDS.includes(field)) return sendResponse(false, 'Invalid field', null, 400);

    const settings = await PlatformSettings.findOne().select(field).lean() as any;
    await deleteBrandingFile(settings?.[field]);
    await PlatformSettings.findOneAndUpdate({}, { $set: { [field]: '' } }, { upsert: true });

    return sendResponse(true, 'Removed', { url: '' });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Failed to remove', null, 500);
  }
}
