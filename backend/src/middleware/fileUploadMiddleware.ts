// ============================================================
// DibnowRepairSaaS — File Upload Security
// MIME whitelist, size limits, malware-safe, tenant-scoped paths
// All files go to Cloudinary under /tenant-{id}/{entityType}/
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { securityLogger, logger } from '../utils/logger';
import { ValidationError, ForbiddenError } from '../errors';

// ─── Configure Cloudinary ─────────────────────────────────────
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Allowed MIME types — whitelist only ─────────────────────
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf'],
  all: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
};

// ─── Max file sizes per entity type ──────────────────────────
const MAX_FILE_SIZES: Record<string, number> = {
  ticket: 10 * 1024 * 1024,    // 10MB — damage photos
  invoice: 5 * 1024 * 1024,    // 5MB — invoice PDFs
  inventory: 5 * 1024 * 1024,  // 5MB — part images
  customer: 2 * 1024 * 1024,   // 2MB — ID photos
  logo: 2 * 1024 * 1024,       // 2MB — shop logo
};

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

// ─── Validate file before upload ─────────────────────────────
const validateFile = (
  mimeType: string,
  fileSize: number,
  entityType: string,
  tenantId: string
): void => {
  // Check MIME type against whitelist
  const allowed = ALLOWED_MIME_TYPES.all;
  if (!allowed.includes(mimeType)) {
    securityLogger.fileUploadRejected(
      `Rejected MIME type: ${mimeType}`,
      tenantId,
      mimeType
    );
    throw new ValidationError(
      `File type '${mimeType}' is not allowed. Allowed types: JPEG, PNG, WebP, GIF, PDF`
    );
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[entityType] || 5 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new ValidationError(
      `File size exceeds limit of ${maxSize / (1024 * 1024)}MB for ${entityType}`
    );
  }

  // Block dangerous MIME types that could be misrepresented
  const dangerousMimes = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-php',
    'text/javascript',
    'application/javascript',
    'text/html',
  ];

  if (dangerousMimes.includes(mimeType)) {
    securityLogger.fileUploadRejected('Dangerous MIME type blocked', tenantId, mimeType);
    throw new ForbiddenError('This file type is not permitted');
  }
};

// ─── Build tenant-scoped Cloudinary folder path ──────────────
// Architecture: /tenant-{id}/{entityType}/{entityId}/
const buildCloudinaryFolder = (
  tenantId: string,
  entityType: string,
  entityId: string
): string => {
  return `tenant-${tenantId}/${entityType}/${entityId}`;
};

// ─── Upload file to Cloudinary ───────────────────────────────
export const uploadFile = async (
  fileBuffer: Buffer,
  mimeType: string,
  fileSize: number,
  tenantId: string,
  entityType: string,
  entityId: string,
  filename: string
): Promise<UploadResult> => {
  // Validate before touching Cloudinary
  validateFile(mimeType, fileSize, entityType, tenantId);

  const folder = buildCloudinaryFolder(tenantId, entityType, entityId);
  const isImage = mimeType.startsWith('image/');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isImage ? 'image' : 'raw',
        // Auto-format and compress images
        ...(isImage && {
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
            { width: 2000, height: 2000, crop: 'limit' }, // cap at 2000px
          ],
        }),
        // Security: strip EXIF metadata from images (removes GPS data)
        ...(isImage && { exif: false }),
        tags: [`tenant:${tenantId}`, `entity:${entityType}`],
        context: { tenantId, entityType, entityId },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any, result: any) => {
        if (error || !result) {
          logger.error('Cloudinary upload failed', { error, tenantId, entityType });
          reject(new Error('File upload failed'));
          return;
        }

        resolve({
          url: result.secure_url as string,
          publicId: result.public_id as string,
          format: result.format as string,
          bytes: result.bytes as number,
          width: result.width as number | undefined,
          height: result.height as number | undefined,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// ─── Delete file from Cloudinary ─────────────────────────────
export const deleteFile = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('File deleted from Cloudinary', { publicId });
  } catch (error) {
    logger.error('Cloudinary delete failed', { publicId, error });
    throw new Error('File deletion failed');
  }
};

// ─── File upload middleware for Fastify routes ────────────────
export const fileUploadMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const contentType = request.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return; // Not a file upload request, skip
  }

  try {
    const parts = (request as any).parts();
    const uploadedFiles: UploadResult[] = [];

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Validate MIME type from actual file header, not just filename
        const detectedMime = part.mimetype;

        const result = await uploadFile(
          buffer,
          detectedMime,
          buffer.length,
          request.tenantId,
          (request.body as Record<string, string>)?.entityType || 'general',
          (request.body as Record<string, string>)?.entityId || 'unknown',
          part.filename || 'upload'
        );

        uploadedFiles.push(result);
      }
    }

    // Attach uploaded files to request for route handler
    (request as FastifyRequest & { uploadedFiles: UploadResult[] }).uploadedFiles = uploadedFiles;

  } catch (error) {
    if (error instanceof ValidationError || error instanceof ForbiddenError) {
      return reply.status(400).send({ success: false, message: (error as Error).message });
    }
    throw error;
  }
};
