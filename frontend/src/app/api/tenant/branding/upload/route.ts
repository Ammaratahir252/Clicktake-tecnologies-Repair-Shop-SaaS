import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import PlatformSettings from '@/models/platformSettings.model';
import { sendResponse } from '@/utils/apiResponse';

const ALLOWED_FIELDS = ['logo', 'bannerUrl', 'teamPhoto'];

// POST /api/tenant/branding/upload — multipart form: { file, field }
// Owner/manager-only image upload for a shop's own public profile (logo, banner,
// team member photos). Saves to public/uploads/shops/<tenantId>/ and just returns
// the resulting URL — unlike the platform-level branding upload, this route does NOT
// persist the URL onto the Tenant document itself (team photos belong to array items,
// not a single field), so the caller is responsible for saving it via
// /api/shop/profile or /api/tenant/branding afterward.
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const role = req.headers.get('x-role') ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);
    if (!['owner', 'manager'].includes(role)) return sendResponse(false, 'Forbidden', null, 403);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const field = String(form.get('field') || '');

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shops', tenantId);
    await fs.mkdir(uploadDir, { recursive: true });
    const filename = `${field}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/shops/${tenantId}/${filename}`;
    return sendResponse(true, 'Uploaded', { url });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Upload failed', null, 500);
  }
}
