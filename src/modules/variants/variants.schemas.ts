import { z } from 'zod';
import { SIZES } from '../../config/constants.js';

export const createVariantSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  size: z.enum(SIZES, { errorMap: () => ({ message: `Size must be one of: ${SIZES.join(', ')}` }) }),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  price: z.coerce.number().positive().optional(),
  initialQuantity: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).default(5),
});

export const updateVariantSchema = z.object({
  size: z.enum(SIZES).optional(),
  sku: z.string().min(3).optional(),
  price: z.coerce.number().positive().nullable().optional(),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
