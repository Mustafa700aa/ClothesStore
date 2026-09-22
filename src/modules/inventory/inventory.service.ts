import { prisma, PrismaTransactionClient } from '../../config/database.js';
import { NotFoundError, InsufficientStockError } from '../../types/errors.js';
import { RestockInput, AdjustStockInput, InventoryQueryInput } from './inventory.schemas.js';
import { parsePagination, createPaginationMeta } from '../../utils/pagination.js';
import { Prisma } from '@prisma/client';

export class InventoryService {
  /**
   * Atomic stock deduction at CONFIRMED state.
   * Executes directly inside PostgreSQL using $executeRaw for 100% atomic row-locking
   * and prevention of overselling / deadlocks under high concurrency.
   */
  async deductStock(
    tx: PrismaTransactionClient,
    items: { variantId: string; quantity: number }[],
    orderId: string
  ): Promise<void> {
    for (const item of items) {
      const affected = await tx.$executeRaw`
        UPDATE inventories
        SET quantity = quantity - ${item.quantity},
            "updatedAt" = NOW()
        WHERE "variantId" = ${item.variantId}
          AND quantity >= ${item.quantity}
      `;

      if (affected === 0) {
        const inv = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
          include: { variant: { include: { product: true } } },
        });

        const available = inv?.quantity ?? 0;
        const name = inv?.variant.product.name ?? 'Item';
        const size = inv?.variant.size ?? '';

        throw new InsufficientStockError(`${name} (${size})`, available, item.quantity);
      }

      const inventory = await tx.inventory.findUnique({
        where: { variantId: item.variantId },
        select: { id: true },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: inventory!.id,
          change: -item.quantity,
          reason: 'ORDER_CONFIRMED',
          referenceId: orderId,
        },
      });
    }
  }

  /**
   * Stock release for CANCELLED (from CONFIRMED+) or RETURNED orders.
   */
  async releaseStock(
    tx: PrismaTransactionClient,
    items: { variantId: string; quantity: number }[],
    reason: 'ORDER_CANCELLED' | 'ORDER_RETURNED',
    orderId: string
  ): Promise<void> {
    for (const item of items) {
      const updated = await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          quantity: { increment: item.quantity },
        },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: updated.id,
          change: +item.quantity,
          reason,
          referenceId: orderId,
        },
      });
    }
  }

  // Admin: Get all inventory list
  async getAllStock(query: InventoryQueryInput) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.InventoryWhereInput = {};
    if (query.search) {
      where.variant = {
        OR: [
          { sku: { contains: query.search, mode: 'insensitive' } },
          { product: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, inventories] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, name: true, nameAr: true, basePrice: true, isActive: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const items = inventories.map((inv) => ({
      id: inv.id,
      variantId: inv.variantId,
      productName: inv.variant.product.name,
      productNameAr: inv.variant.product.nameAr,
      size: inv.variant.size,
      sku: inv.variant.sku,
      quantity: inv.quantity,
      lowStockAt: inv.lowStockAt,
      isLowStock: inv.quantity <= inv.lowStockAt,
      updatedAt: inv.updatedAt,
    }));

    // Filter low stock if requested in memory/query
    const filteredItems = query.lowStockOnly === 'true' ? items.filter((i) => i.isLowStock) : items;

    return {
      inventories: filteredItems,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Admin: Low stock alerts
  async getLowStockAlerts() {
    const lowStockInventories = await prisma.$queryRaw<
      {
        id: string;
        variantId: string;
        productName: string;
        size: string;
        sku: string;
        quantity: number;
        lowStockAt: number;
      }[]
    >`
      SELECT 
        i.id,
        i."variantId",
        p.name AS "productName",
        v.size,
        v.sku,
        i.quantity,
        i."lowStockAt"
      FROM inventories i
      JOIN variants v ON v.id = i."variantId"
      JOIN products p ON p.id = v."productId"
      WHERE i.quantity <= i."lowStockAt"
        AND v."isActive" = true
        AND p."isActive" = true
      ORDER BY i.quantity ASC;
    `;

    return lowStockInventories;
  }

  // Admin: Restock
  async restock(variantId: string, input: RestockInput) {
    const inventory = await prisma.inventory.findUnique({ where: { variantId } });
    if (!inventory) {
      throw new NotFoundError('Inventory for variant', variantId);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: { increment: input.quantity },
        },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: updated.id,
          change: input.quantity,
          reason: 'MANUAL_RESTOCK',
          referenceId: input.note ?? 'Admin restock',
        },
      });

      return updated;
    });
  }

  // Admin: Manual Adjustment
  async adjustStock(variantId: string, input: AdjustStockInput) {
    const inventory = await prisma.inventory.findUnique({ where: { variantId } });
    if (!inventory) {
      throw new NotFoundError('Inventory for variant', variantId);
    }

    const difference = input.newQuantity - inventory.quantity;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: input.newQuantity,
        },
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: updated.id,
          change: difference,
          reason: 'ADJUSTMENT',
          referenceId: input.reason,
        },
      });

      return updated;
    });
  }

  // Admin: Get Inventory Logs
  async getLogs(variantId: string, query: { page?: number; limit?: number }) {
    const inventory = await prisma.inventory.findUnique({ where: { variantId } });
    if (!inventory) {
      throw new NotFoundError('Inventory for variant', variantId);
    }

    const { page, limit, skip } = parsePagination(query);

    const [total, logs] = await Promise.all([
      prisma.inventoryLog.count({ where: { inventoryId: inventory.id } }),
      prisma.inventoryLog.findMany({
        where: { inventoryId: inventory.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      logs,
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

export const inventoryService = new InventoryService();
