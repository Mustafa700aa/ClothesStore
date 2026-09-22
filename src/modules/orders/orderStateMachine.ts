import { OrderStatus } from '@prisma/client';
import { InvalidTransitionError, InsufficientStockError } from '../../types/errors.js';
import { PrismaTransactionClient } from '../../config/database.js';
import { inventoryService } from '../inventory/inventory.service.js';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  READY_FOR_PICKUP: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export interface TransitionContext {
  adminId?: string;
  note?: string;
  cancelReason?: string;
  returnReason?: string;
  shippingLoss?: number;
  trackingNumber?: string;
  carrierName?: string;
}

export class OrderStateMachine {
  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  async executeTransition(
    tx: PrismaTransactionClient,
    orderId: string,
    toStatus: OrderStatus,
    context: TransitionContext = {}
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const fromStatus = order.status;

    if (!this.canTransition(fromStatus, toStatus)) {
      throw new InvalidTransitionError(fromStatus, toStatus);
    }

    // 1. Gather all variant items to reserve/release
    // Note: Items may have variantId directly (product variant purchase)
    // or from decomposed bundle items.
    const variantItems = order.items
      .filter((item) => item.variantId !== null)
      .map((item) => ({
        variantId: item.variantId!,
        quantity: item.quantity,
      }));

    // 2. Handle Stock Impacts per Transition
    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    if (toStatus === OrderStatus.CONFIRMED) {
      // Deduct stock atomically
      await inventoryService.deductStock(tx, variantItems, order.id);
      updateData.confirmedAt = now;
    } else if (toStatus === OrderStatus.READY_FOR_PICKUP) {
      if (context.trackingNumber) updateData.trackingNumber = context.trackingNumber;
      if (context.carrierName) updateData.carrierName = context.carrierName;
    } else if (toStatus === OrderStatus.SHIPPED) {
      updateData.shippedAt = now;
      if (context.trackingNumber) updateData.trackingNumber = context.trackingNumber;
      if (context.carrierName) updateData.carrierName = context.carrierName;
    } else if (toStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = now;
    } else if (toStatus === OrderStatus.CANCELLED) {
      updateData.cancelledAt = now;
      if (context.cancelReason) updateData.cancelReason = context.cancelReason;

      // Only release stock if it was previously deducted (from CONFIRMED or READY_FOR_PICKUP)
      if (fromStatus === OrderStatus.CONFIRMED || fromStatus === OrderStatus.READY_FOR_PICKUP) {
        await inventoryService.releaseStock(tx, variantItems, 'ORDER_CANCELLED', order.id);
      }
    } else if (toStatus === OrderStatus.RETURNED) {
      updateData.returnedAt = now;
      if (context.returnReason) updateData.returnReason = context.returnReason;
      if (context.shippingLoss !== undefined) updateData.shippingLoss = context.shippingLoss;

      // Release stock back and record shipping loss
      await inventoryService.releaseStock(tx, variantItems, 'ORDER_RETURNED', order.id);
    }

    if (context.note) {
      updateData.adminNotes = order.adminNotes
        ? `${order.adminNotes}\n[${now.toISOString()}]: ${context.note}`
        : `[${now.toISOString()}]: ${context.note}`;
    }

    // 3. Update Order record
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // 4. Record state transition in OrderStatusHistory
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        changedBy: context.adminId,
        note: context.note ?? context.cancelReason ?? context.returnReason,
      },
    });

    return updatedOrder;
  }
}

export const orderStateMachine = new OrderStateMachine();
