export const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'] as const;
export type Size = typeof SIZES[number];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const;

export type OrderStatusType = keyof typeof ORDER_STATUS;

export const ORDER_STATUS_LABELS_AR: Record<OrderStatusType, string> = {
  PENDING: 'قيد المراجعة',
  CONFIRMED: 'مؤكد',
  READY_FOR_PICKUP: 'جاهز للشحن',
  SHIPPED: 'قيد التوصيل',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  RETURNED: 'مرتجع',
};

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
