import { describe, it, expect } from 'vitest';
import { requestPresignedUrlSchema } from '../../src/modules/uploads/uploads.schemas.js';
import { isR2Configured, getR2Client } from '../../src/config/storage.js';

describe('Uploads & Cloudflare R2 - Unit Tests', () => {
  it('should accept valid image types (JPEG, PNG, WebP, AVIF)', () => {
    const validInputs = [
      { fileName: 'tshirt.jpg', fileType: 'image/jpeg', folder: 'products' },
      { fileName: 'hoodie.png', fileType: 'image/png', folder: 'bundles' },
      { fileName: 'banner.webp', fileType: 'image/webp', folder: 'banners' },
      { fileName: 'look.avif', fileType: 'image/avif', folder: 'general' },
    ];

    for (const input of validInputs) {
      const result = requestPresignedUrlSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should reject dangerous or non-image MIME types', () => {
    const invalidTypes = [
      'application/pdf',
      'text/html',
      'application/javascript',
      'image/gif',
      'image/svg+xml',
    ];

    for (const fileType of invalidTypes) {
      const result = requestPresignedUrlSchema.safeParse({
        fileName: 'test.file',
        fileType,
      });
      expect(result.success).toBe(false);
    }
  });

  it('should reject invalid or malicious file names', () => {
    const invalidNames = [
      '../../../etc/passwd',
      '<script>alert(1)</script>.png',
      'invalid name with spaces.jpg',
    ];

    for (const fileName of invalidNames) {
      const result = requestPresignedUrlSchema.safeParse({
        fileName,
        fileType: 'image/jpeg',
      });
      expect(result.success).toBe(false);
    }
  });

  it('isR2Configured should correctly report status and getR2Client throws if credentials missing', () => {
    // If not configured in test environment, calling getR2Client should throw a helpful error
    if (!isR2Configured()) {
      expect(() => getR2Client()).toThrow(/Cloudflare R2 is not configured/);
    } else {
      expect(getR2Client()).toBeDefined();
    }
  });
});
