import { z } from 'zod';

export const restockSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  note: z.string().optional(),
});

export const adjustStockSchema = z.object({
  newQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  reason: z.string().min(2, 'Reason for manual adjustment is required'),
});

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  lowStockOnly: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

export type RestockInput = z.infer<typeof restockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
