import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import Tenant from '@/models/tenant.model';
import { sendResponse } from '@/utils/apiResponse';
import {
  uploadImage,
  destroyImage,
  publicIdFromUrl,
  CloudinaryConfigError,
} from '@/lib/uploads/cloudinary';

const ALLOWED_FIELDS = ['logo', 'bannerUrl', 'teamPhoto'] as const;

// POST /api/tenant/branding/upload — multipart form: { file, field }
// Owner/manager-only image upload for a shop's own public profile (logo, banner,
// team member photos). Uploads to Cloudinary under shops/<tenantId>/ — permanent
// cloud storage that works on serverless hosts, unlike the old local-disk writes.
//
// logo/bannerUrl are persisted onto the Tenant document here (URL + public_id),
// replacing and deleting the previous Cloudinary file. teamPhoto belongs to an
// array item the caller manages, so it only returns { url, publicId } for the
// caller to save via /api/shop/profile.
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!['owner', 'manager'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const field = String(form.get('field') || '') as (typeof ALLOWED_FIELDS)[number];

    if (!file) return sendResponse(false, 'No file provided', null, 400);
    if (!ALLOWED_FIELDS.includes(field)) return sendResponse(false, 'Invalid field', null, 400);

    const settings = await PlatformSettings.findOne().select('maxUploadSizeMb allowedFileTypes').lean() as any;
    const maxBytes = (settings?.maxUploadSizeMb ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return sendResponse(false, `File exceeds the configured max upload size (${settings?.maxUploadSizeMb ?? 10}MB)`, null, 400);
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowed: string[] = settings?.allowedFileTypes ?? ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) {
      return sendResponse(false, `File type ".${ext}" isn't in the allowed list (${allowed.join(', ')})`, null, 400);
    }

    const uploaded = await uploadImage(file, `shops/${tenantId}`);

    if (field === 'logo' || field === 'bannerUrl') {
      const pidField = field === 'logo' ? 'logoPublicId' : 'bannerPublicId';
      const tenant = await Tenant.findById(tenantId).select(`${field} ${pidField}`).lean() as any;
      // Replace-in-place: remove the previous Cloudinary file for this slot.
      await destroyImage(tenant?.[pidField] || publicIdFromUrl(tenant?.[field]));
      await Tenant.findByIdAndUpdate(tenantId, {
        $set: { [field]: uploaded.url, [pidField]: uploaded.publicId },
      });
    }

    return sendResponse(true, 'Uploaded', { url: uploaded.url, publicId: uploaded.publicId });
  } catch (err: any) {
    if (err instanceof CloudinaryConfigError) return sendResponse(false, err.message, null, 503);
    return sendResponse(false, err.message || 'Upload failed', null, 500);
  }
}
