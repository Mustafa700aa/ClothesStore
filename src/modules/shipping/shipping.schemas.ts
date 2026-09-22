import { z } from 'zod';

export const updateShippingZoneSchema = z.object({
  shippingCost: z.coerce.number().positive('Shipping cost must be positive').optional(),
  estimatedDays: z.coerce.number().int().positive('Estimated days must be positive').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateShippingZoneInput = z.infer<typeof updateShippingZoneSchema>;
