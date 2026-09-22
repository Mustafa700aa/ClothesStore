import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../types/errors.js';
import { CreateVariantInput, UpdateVariantInput } from './variants.schemas.js';

export class VariantsService {
  async getByProductId(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    return await prisma.variant.findMany({
      where: { productId },
      include: {
        inventory: true,
      },
      orderBy: { size: 'asc' },
    });
  }

  async createVariant(input: CreateVariantInput) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) {
      throw new NotFoundError('Product', input.productId);
    }

    // Check SKU uniqueness
    const existingSku = await prisma.variant.findUnique({ where: { sku: input.sku } });
    if (existingSku) {
      throw new ConflictError(`Variant with SKU "${input.sku}" already exists`);
    }

    // Check (productId, size) uniqueness
    const existingSize = await prisma.variant.findUnique({
      where: {
        productId_size: {
          productId: input.productId,
          size: input.size,
        },
      },
    });
    if (existingSize) {
      throw new ConflictError(`Product already has a variant with size "${input.size}"`);
    }

    return await prisma.$transaction(async (tx) => {
      const variant = await tx.variant.create({
        data: {
          productId: input.productId,
          size: input.size,
          sku: input.sku,
          price: input.price,
          isActive: true,
        },
      });

      const inventory = await tx.inventory.create({
        data: {
          variantId: variant.id,
          quantity: input.initialQuantity,
          lowStockAt: input.lowStockAt,
        },
      });

      if (input.initialQuantity > 0) {
        await tx.inventoryLog.create({
          data: {
            inventoryId: inventory.id,
            change: input.initialQuantity,
            reason: 'MANUAL_RESTOCK',
            referenceId: 'VARIANT_CREATED',
          },
        });
      }

      return {
        ...variant,
        inventory,
      };
    });
  }

  async updateVariant(id: string, input: UpdateVariantInput) {
    const variant = await prisma.variant.findUnique({ where: { id } });
    if (!variant) {
      throw new NotFoundError('Variant', id);
    }

    if (input.sku && input.sku !== variant.sku) {
      const existingSku = await prisma.variant.findUnique({ where: { sku: input.sku } });
      if (existingSku) {
        throw new ConflictError(`Variant with SKU "${input.sku}" already exists`);
      }
    }

    return await prisma.variant.update({
      where: { id },
      data: {
        ...(input.size && { size: input.size }),
        ...(input.sku && { sku: input.sku }),
        ...(input.price !== undefined && { price: input.price }),
      },
      include: {
        inventory: true,
      },
    });
  }

  async toggleActive(id: string) {
    const variant = await prisma.variant.findUnique({ where: { id } });
    if (!variant) {
      throw new NotFoundError('Variant', id);
    }

    return await prisma.variant.update({
      where: { id },
      data: { isActive: !variant.isActive },
    });
  }
}

export const variantsService = new VariantsService();
