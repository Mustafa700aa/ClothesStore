import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

const phoneRegex = /^01[0125][0-9]{8}$/;

export const orderItemProductSchema = z.object({
  type: z.literal('product'),
  variantId: z.string().uuid('Valid variantId is required'),
  quantity: z.coerce.number().int().positive().default(1),
});

export const orderItemBundleSchema = z.object({
  type: z.literal('bundle'),
  bundleId: z.string().uuid('Valid bundleId is required'),
  quantity: z.coerce.number().int().positive().default(1),
  selectedVariants: z.array(
    z.object({
      bundleItemId: z.string().uuid('Valid bundleItemId is required'),
      variantId: z.string().uuid('Valid variantId is required'),
    })
  ).min(1, 'Selected variants are required for each bundle item'),
});

export const orderItemSchema = z.discriminatedUnion('type', [
  orderItemProductSchema,
  orderItemBundleSchema,
]);

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Customer name is required').max(100, 'Name cannot exceed 100 characters'),
    phone: z.string().regex(phoneRegex, 'Phone must be a valid 11-digit Egyptian mobile number (e.g. 01012345678)'),
    altPhone: z.string().regex(phoneRegex, 'Alternate phone must be a valid 11-digit Egyptian mobile number').optional().or(z.literal('')),
    address: z.string().trim().min(5, 'Full street address is required').max(300, 'Address cannot exceed 300 characters'),
    city: z.string().trim().min(2, 'City/district is required').max(100, 'City cannot exceed 100 characters'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),
  shippingZoneId: z.string().uuid('Valid shippingZoneId is required'),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(1000, 'Note cannot exceed 1000 characters').optional(),
  cancelReason: z.string().trim().max(300, 'Cancel reason cannot exceed 300 characters').optional(),
  returnReason: z.string().trim().max(300, 'Return reason cannot exceed 300 characters').optional(),
  shippingLoss: z.coerce.number().min(0).max(100000).optional(),
  trackingNumber: z.string().trim().max(100, 'Tracking number cannot exceed 100 characters').optional(),
  carrierName: z.string().trim().max(100, 'Carrier name cannot exceed 100 characters').optional(),
});

export const appendNoteSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(1000, 'Note cannot exceed 1000 characters'),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().trim().max(100).optional(),
  governorate: z.string().trim().max(100).optional(),
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AppendNoteInput = z.infer<typeof appendNoteSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
