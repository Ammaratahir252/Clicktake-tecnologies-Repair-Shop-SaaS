import crypto from 'crypto';
import {
  getCloudinaryConfig,
  signCloudinaryParams,
  publicIdFromUrl,
  isLegacyLocalUrl,
  CloudinaryConfigError,
} from '@/lib/uploads/cloudinary';

describe('cloudinary upload helper', () => {
  const ENV_KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  test('getCloudinaryConfig throws a clear config error when env vars are missing', () => {
    expect(() => getCloudinaryConfig()).toThrow(CloudinaryConfigError);
    expect(() => getCloudinaryConfig()).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  test('getCloudinaryConfig throws when only some vars are set', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    expect(() => getCloudinaryConfig()).toThrow(CloudinaryConfigError);
  });

  test('getCloudinaryConfig returns the configured values', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key123';
    process.env.CLOUDINARY_API_SECRET = 'secret456';
    expect(getCloudinaryConfig()).toEqual({ cloudName: 'demo', apiKey: 'key123', apiSecret: 'secret456' });
  });

  test('signCloudinaryParams matches Cloudinary sorted-params SHA-1 scheme', () => {
    const params = { timestamp: 1700000000, folder: 'branding' };
    const expected = crypto
      .createHash('sha1')
      .update('folder=branding&timestamp=1700000000' + 'secret456')
      .digest('hex');
    expect(signCloudinaryParams(params, 'secret456')).toBe(expected);
  });

  test('publicIdFromUrl extracts folder/name from a delivery URL', () => {
    expect(
      publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/v1712345/tickets/abc/photo-1a2b.jpg')
    ).toBe('tickets/abc/photo-1a2b');
  });

  test('publicIdFromUrl handles URLs without a version segment', () => {
    expect(
      publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/branding/logo.png')
    ).toBe('branding/logo');
  });

  test('publicIdFromUrl returns null for legacy and foreign URLs', () => {
    expect(publicIdFromUrl('/uploads/branding/logo-abc.png')).toBeNull();
    expect(publicIdFromUrl('https://example.com/image.png')).toBeNull();
    expect(publicIdFromUrl('')).toBeNull();
    expect(publicIdFromUrl(undefined)).toBeNull();
  });

  test('isLegacyLocalUrl recognises pre-Cloudinary disk paths', () => {
    expect(isLegacyLocalUrl('/uploads/shops/x/logo.png')).toBe(true);
    expect(isLegacyLocalUrl('https://res.cloudinary.com/demo/image/upload/v1/a.png')).toBe(false);
    expect(isLegacyLocalUrl('')).toBe(false);
  });
});
