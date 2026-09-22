import { z } from 'zod';

export const bundleItemInputSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  quantity: z.coerce.number().int().positive().max(100).default(1),
  allowedVariantIds: z.array(z.string().uuid()).min(1, 'At least one allowed variant must be specified').max(50),
});

export const createBundleSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150, 'Name cannot exceed 150 characters'),
  nameAr: z.string().trim().max(150, 'Arabic name cannot exceed 150 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  image: z.string().url('Must be valid URL').optional(),
  price: z.coerce.number().positive('Price must be a positive number').max(1000000, 'Price exceeds maximum allowed'),
  sortOrder: z.coerce.number().int().default(0),
  items: z.array(bundleItemInputSchema).min(1, 'Bundle must contain at least one item').max(20),
});

export const updateBundleSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  nameAr: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  image: z.string().url().optional(),
  price: z.coerce.number().positive().max(1000000).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
export type BundleItemInput = z.infer<typeof bundleItemInputSchema>;
