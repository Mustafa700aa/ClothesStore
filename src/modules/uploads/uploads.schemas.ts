import { z } from 'zod';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const requestPresignedUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .regex(/^[\w.-]+$/, 'File name can only contain letters, numbers, dots, hyphens, and underscores'),
  fileType: z.enum(ALLOWED_IMAGE_TYPES, {
    errorMap: () => ({ message: 'Unsupported file type. Allowed types: JPEG, PNG, WebP, AVIF' }),
  }),
  folder: z.enum(['products', 'bundles', 'banners', 'general']).default('products'),
});

export type RequestPresignedUrlInput = z.infer<typeof requestPresignedUrlSchema>;
