import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError, InsufficientStockError } from '../../types/errors.js';
import { CreateOrderInput, UpdateOrderStatusInput, OrderQueryInput } from './orders.schemas.js';
import { generateOrderNumber } from '../../utils/orderIdGenerator.js';
import { orderStateMachine } from './orderStateMachine.js';
import { parsePagination, createPaginationMeta } from '../../utils/pagination.js';
import { OrderStatus, Prisma } from '@prisma/client';

export class OrdersService {
  async createOrder(input: CreateOrderInput, idempotencyKey?: string) {
    // 1. Check Idempotency Key if provided
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: {
          items: true,
          shippingZone: true,
        },
      });

      if (existing) {
        return {
          order: existing,
          isIdempotent: true,
        };
      }
    }

    // 2. Validate Shipping Zone
    const shippingZone = await prisma.shippingZone.findUnique({
      where: { id: input.shippingZoneId },
    });

    if (!shippingZone || !shippingZone.isActive) {
      throw new NotFoundError('Shipping Zone', input.shippingZoneId);
    }

    const shippingCost = Number(shippingZone.shippingCost);

    // 3. Resolve Items & Calculate Financials
    interface ResolvedItem {
      variantId?: string;
      bundleId?: string;
      productName: string;
      variantSize?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }

    const resolvedItems: ResolvedItem[] = [];

    for (const item of input.items) {
      if (item.type === 'product') {
        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant || !variant.isActive || !variant.product.isActive) {
          throw new NotFoundError('Variant or product is inactive or not found', item.variantId);
        }

        const unitPrice = Number(variant.price ?? variant.product.basePrice);
        const totalPrice = unitPrice * item.quantity;

        resolvedItems.push({
          variantId: variant.id,
          productName: variant.product.name,
          variantSize: variant.size,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      } else if (item.type === 'bundle') {
        const bundle = await prisma.bundle.findUnique({
          where: { id: item.bundleId },
          include: {
            items: {
              include: {
                product: true,
                allowedVariants: { include: { variant: true } },
              },
            },
          },
        });

        if (!bundle || !bundle.isActive) {
          throw new NotFoundError('Bundle', item.bundleId);
        }

        const bundleUnitPrice = Number(bundle.price);
        const bundleTotalPrice = bundleUnitPrice * item.quantity;

        // Bundle item record for snapshot
        resolvedItems.push({
          bundleId: bundle.id,
          productName: `[باقة] ${bundle.name}`,
          quantity: item.quantity,
          unitPrice: bundleUnitPrice,
          totalPrice: bundleTotalPrice,
        });

        // Resolve each component variant selected by the customer
        for (const bItem of bundle.items) {
          const selected = item.selectedVariants.find((s) => s.bundleItemId === bItem.id);
          if (!selected) {
            throw new ConflictError(`Missing variant selection for item "${bItem.product.name}" in bundle`);
          }

          const isAllowed = bItem.allowedVariants.some((av) => av.variantId === selected.variantId);
          if (!isAllowed) {
            throw new ConflictError(`Selected variant is not allowed for item "${bItem.product.name}"`);
          }

          const variant = await prisma.variant.findUnique({
            where: { id: selected.variantId },
            include: { product: true },
          });

          if (!variant || !variant.isActive) {
            throw new NotFoundError('Selected bundle variant is inactive or not found', selected.variantId);
          }

          // Component variant item (for stock deduction, priced at 0 since parent bundle holds the price)
          resolvedItems.push({
            variantId: variant.id,
            productName: `  └─ ${variant.product.name}`,
            variantSize: variant.size,
            quantity: bItem.quantity * item.quantity,
            unitPrice: 0,
            totalPrice: 0,
          });
        }
      }
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal + shippingCost;

    // 4. Upsert Guest Customer Profile
    const customer = await prisma.customer.upsert({
      where: { phone: input.customer.phone },
      update: {
        name: input.customer.name,
        altPhone: input.customer.altPhone || null,
        address: input.customer.address,
        city: input.customer.city,
        notes: input.customer.notes || null,
      },
      create: {
        phone: input.customer.phone,
        altPhone: input.customer.altPhone || null,
        name: input.customer.name,
        address: input.customer.address,
        city: input.customer.city,
        notes: input.customer.notes || null,
      },
    });

    // 5. Execute Order Creation in Transaction
    // Initial status is PENDING — Delayed Inventory Allocation (NO stock is deducted yet)
    try {
      return await prisma.$transaction(async (tx) => {
        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            idempotencyKey: idempotencyKey || null,
            customerId: customer.id,
            shippingName: input.customer.name,
            shippingPhone: input.customer.phone,
            shippingAltPhone: input.customer.altPhone || null,
            shippingAddress: input.customer.address,
            shippingCity: input.customer.city,
            shippingZoneId: shippingZone.id,
            subtotal,
            shippingCost,
            total,
            status: OrderStatus.PENDING,
            adminNotes: input.customer.notes ? `ملاحظات العميل: ${input.customer.notes}` : null,
            items: {
              create: resolvedItems.map((ri) => ({
                variantId: ri.variantId || null,
                bundleId: ri.bundleId || null,
                productName: ri.productName,
                variantSize: ri.variantSize || null,
                quantity: ri.quantity,
                unitPrice: ri.unitPrice,
                totalPrice: ri.totalPrice,
              })),
            },
            statusHistory: {
              create: {
                toStatus: OrderStatus.PENDING,
                note: 'Order created via storefront (Guest Checkout)',
              },
            },
          },
          include: {
            items: true,
            shippingZone: true,
          },
        });

        return {
          order,
          isIdempotent: false,
        };
      });
    } catch (error: any) {
      // If a concurrent request with the exact same idempotencyKey created the order milliseconds ago
      if (idempotencyKey && error?.code === 'P2002') {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
          include: {
            items: true,
            shippingZone: true,
          },
        });
        if (existing) {
          return {
            order: existing,
            isIdempotent: true,
          };
        }
      }
      throw error;
    }
  }

  // Update Order Status via State Machine
  async updateStatus(id: string, input: UpdateOrderStatusInput, adminId?: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }

    try {
      return await prisma.$transaction(async (tx) => {
        return await orderStateMachine.executeTransition(tx, id, input.status, {
          adminId,
          note: input.note,
          cancelReason: input.cancelReason,
          returnReason: input.returnReason,
          shippingLoss: input.shippingLoss,
          trackingNumber: input.trackingNumber,
          carrierName: input.carrierName,
        });
      });
    } catch (error) {
      // Edge Case Handling: Stock Exhaustion at Confirmation
      if (error instanceof InsufficientStockError && input.status === OrderStatus.CONFIRMED) {
        // Auto-cancel with descriptive out-of-stock note
        const autoCancelled = await prisma.$transaction(async (tx) => {
          return await tx.order.update({
            where: { id },
            data: {
              status: OrderStatus.CANCELLED,
              cancelReason: 'OUT_OF_STOCK',
              cancelledAt: new Date(),
              adminNotes: order.adminNotes
                ? `${order.adminNotes}\n[AUTO_CANCELLED]: نفد المخزون أثناء محاولة التأكيد (${error.productName})`
                : `[AUTO_CANCELLED]: نفد المخزون أثناء محاولة التأكيد (${error.productName})`,
              statusHistory: {
                create: {
                  fromStatus: OrderStatus.PENDING,
                  toStatus: OrderStatus.CANCELLED,
                  changedBy: adminId,
                  note: `Auto-cancelled: Insufficient stock for ${error.productName}. Available: ${error.available}, Requested: ${error.requested}`,
                },
              },
            },
          });
        });

        return {
          ...autoCancelled,
          _autoCancelledReason: error.message,
        };
      }

      throw error;
    }
  }

  // Public Order Tracking
  async trackOrder(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        shippingCity: true,
        total: true,
        trackingNumber: true,
        carrierName: true,
        confirmedAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        returnedAt: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            variantSize: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order', orderNumber);
    }

    return order;
  }

  // Admin: Get all orders with rich filters
  async getAdminOrders(query: OrderQueryInput) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.governorate) {
      where.shippingZone = {
        governorate: { contains: query.governorate, mode: 'insensitive' },
      };
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { shippingPhone: { contains: query.search } },
        { shippingName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shippingZone: true,
          customer: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      orders,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Admin: Get single order detail
  async getAdminOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        shippingZone: true,
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order', id);
    }

    return order;
  }

  // Admin: Update Notes
  async updateNotes(id: string, note: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }

    const updatedNotes = order.adminNotes
      ? `${order.adminNotes}\n[${new Date().toISOString()}]: ${note}`
      : `[${new Date().toISOString()}]: ${note}`;

    return await prisma.order.update({
      where: { id },
      data: { adminNotes: updatedNotes },
    });
  }
}

export const ordersService = new OrdersService();
