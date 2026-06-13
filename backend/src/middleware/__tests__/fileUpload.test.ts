jest.mock('../../config/env', () => ({
  env: {
    ENCRYPTION_KEY:         '12345678901234567890123456789012',
    CLOUDINARY_CLOUD_NAME:  'test-cloud',
    CLOUDINARY_API_KEY:     'test-key',
    CLOUDINARY_API_SECRET:  'test-secret',
  },
}));

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger:         { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  securityLogger: { fileUploadRejected: jest.fn(), rateLimitExceeded: jest.fn() },
}));

import { uploadFile, deleteFile } from '../fileUploadMiddleware';
import { v2 as cloudinary } from 'cloudinary';
import { ValidationError } from '../../errors';

const makeBuffer = (size: number) => Buffer.alloc(size, 'a');

describe('uploadFile — MIME validation', () => {
  it('throws ValidationError for disallowed MIME type', async () => {
    await expect(
      uploadFile(makeBuffer(100), 'text/csv', 100, 'tenant1', 'ticket', 'entity1', 'file.csv')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for executable MIME type', async () => {
    await expect(
      uploadFile(makeBuffer(100), 'application/x-executable', 100, 'tenant1', 'ticket', 'e1', 'file.exe')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when file exceeds size limit', async () => {
    const bigBuffer = makeBuffer(11 * 1024 * 1024);
    await expect(
      uploadFile(bigBuffer, 'image/jpeg', bigBuffer.length, 'tenant1', 'ticket', 'e1', 'photo.jpg')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when invoice PDF exceeds 5MB limit', async () => {
    const bigBuffer = makeBuffer(6 * 1024 * 1024);
    await expect(
      uploadFile(bigBuffer, 'application/pdf', bigBuffer.length, 'tenant1', 'invoice', 'e1', 'inv.pdf')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for text/html MIME type', async () => {
    await expect(
      uploadFile(makeBuffer(100), 'text/html', 100, 'tenant1', 'ticket', 'e1', 'page.html')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for JavaScript MIME type', async () => {
    await expect(
      uploadFile(makeBuffer(100), 'application/javascript', 100, 'tenant1', 'ticket', 'e1', 'script.js')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('calls cloudinary upload_stream for valid image', async () => {
    const mockStream = { end: jest.fn() };
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (e: null, r: object) => void) => {
        cb(null, {
          secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
          public_id:  'tenant-t1/ticket/e1/abc',
          format:     'jpg',
          bytes:      1024,
          width:      800,
          height:     600,
        });
        return mockStream;
      }
    );

    const result = await uploadFile(
      makeBuffer(1024), 'image/jpeg', 1024, 'tenant1', 'ticket', 'e1', 'photo.jpg'
    );

    expect(result.url).toContain('cloudinary.com');
    expect(result.format).toBe('jpg');
    expect(result.bytes).toBe(1024);
  });

  it('calls cloudinary upload_stream for valid PDF', async () => {
    const mockStream = { end: jest.fn() };
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (e: null, r: object) => void) => {
        cb(null, {
          secure_url: 'https://res.cloudinary.com/test/raw/upload/test.pdf',
          public_id:  'tenant-t1/invoice/e1/abc',
          format:     'pdf',
          bytes:      500000,
        });
        return mockStream;
      }
    );

    const result = await uploadFile(
      makeBuffer(500000), 'application/pdf', 500000, 'tenant1', 'invoice', 'e1', 'inv.pdf'
    );
    expect(result.format).toBe('pdf');
  });

  it('throws Error when cloudinary returns error', async () => {
    const mockStream = { end: jest.fn() };
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (e: Error, r: null) => void) => {
        cb(new Error('Cloudinary down'), null);
        return mockStream;
      }
    );

    await expect(
      uploadFile(makeBuffer(1024), 'image/jpeg', 1024, 'tenant1', 'ticket', 'e1', 'photo.jpg')
    ).rejects.toThrow('File upload failed');
  });
});

describe('deleteFile', () => {
  it('calls cloudinary destroy with publicId', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });
    await expect(deleteFile('tenant-t1/ticket/e1/abc')).resolves.toBeUndefined();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('tenant-t1/ticket/e1/abc');
  });

  it('throws Error when cloudinary destroy fails', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('API error'));
    await expect(deleteFile('bad-id')).rejects.toThrow('File deletion failed');
  });
});

describe('MIME type whitelist coverage', () => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const rejectedTypes = ['text/csv', 'application/zip', 'video/mp4', 'audio/mp3', 'text/plain'];

  it.each(allowedTypes)('accepts %s', async (mime) => {
    const mockStream = { end: jest.fn() };
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_opts: unknown, cb: (e: null, r: object) => void) => {
        cb(null, {
          secure_url: 'https://cloudinary.com/x',
          public_id: 'x', format: 'jpg', bytes: 100,
        });
        return mockStream;
      }
    );
    await expect(
      uploadFile(makeBuffer(100), mime, 100, 'tenant1', 'ticket', 'e1', 'file')
    ).resolves.toBeDefined();
  });

  it.each(rejectedTypes)('rejects %s', async (mime) => {
    await expect(
      uploadFile(makeBuffer(100), mime, 100, 'tenant1', 'ticket', 'e1', 'file')
    ).rejects.toBeInstanceOf(ValidationError);
  });
});