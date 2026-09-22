import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150, 'Name cannot exceed 150 characters'),
  nameAr: z.string().trim().max(150, 'Arabic name cannot exceed 150 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  basePrice: z.coerce.number().positive('Base price must be a positive number').max(1000000, 'Price exceeds maximum allowed'),
  images: z.array(z.string().url('Must be valid URL')).max(10, 'Maximum 10 images allowed').default([]),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
