import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../types/errors.js';
import { CreateBundleInput, UpdateBundleInput } from './bundles.schemas.js';
import { parsePagination, createPaginationMeta } from '../../utils/pagination.js';
import { Prisma } from '@prisma/client';

export class BundlesService {
  // Public Storefront: Active bundles with allowed variants and stock
  async getPublicBundles(query: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.BundleWhereInput = { isActive: true };

    const [total, bundles] = await Promise.all([
      prisma.bundle.count({ where }),
      prisma.bundle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, nameAr: true, basePrice: true, images: true },
              },
              allowedVariants: {
                include: {
                  variant: {
                    include: {
                      inventory: {
                        select: { quantity: true, lowStockAt: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedBundles = bundles.map((bundle) => {
      const items = bundle.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productNameAr: item.product.nameAr,
        quantity: item.quantity,
        images: item.product.images,
        allowedVariants: item.allowedVariants.map((av) => ({
          variantId: av.variant.id,
          size: av.variant.size,
          sku: av.variant.sku,
          price: av.variant.price ?? item.product.basePrice,
          availableStock: av.variant.inventory?.quantity ?? 0,
        })),
      }));

      // Calculate overall bundle availability based on allowed variants
      const isAvailable = items.every((item) =>
        item.allowedVariants.some((v) => v.availableStock >= item.quantity)
      );

      return {
        id: bundle.id,
        name: bundle.name,
        nameAr: bundle.nameAr,
        description: bundle.description,
        image: bundle.image,
        price: bundle.price,
        isAvailable,
        items,
      };
    });

    return {
      bundles: formattedBundles,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Public Storefront: Single bundle by ID
  async getPublicBundleById(id: string) {
    const bundle = await prisma.bundle.findFirst({
      where: { id, isActive: true },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, nameAr: true, basePrice: true, images: true },
            },
            allowedVariants: {
              include: {
                variant: {
                  include: {
                    inventory: {
                      select: { quantity: true, lowStockAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!bundle) {
      throw new NotFoundError('Bundle', id);
    }

    const items = bundle.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productNameAr: item.product.nameAr,
      quantity: item.quantity,
      images: item.product.images,
      allowedVariants: item.allowedVariants.map((av) => ({
        variantId: av.variant.id,
        size: av.variant.size,
        sku: av.variant.sku,
        price: av.variant.price ?? item.product.basePrice,
        availableStock: av.variant.inventory?.quantity ?? 0,
      })),
    }));

    const isAvailable = items.every((item) =>
      item.allowedVariants.some((v) => v.availableStock >= item.quantity)
    );

    return {
      id: bundle.id,
      name: bundle.name,
      nameAr: bundle.nameAr,
      description: bundle.description,
      image: bundle.image,
      price: bundle.price,
      isAvailable,
      items,
    };
  }

  // Admin: Get all bundles
  async getAllAdminBundles(query: { page?: number; limit?: number; isActive?: string }) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.BundleWhereInput = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [total, bundles] = await Promise.all([
      prisma.bundle.count({ where }),
      prisma.bundle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          items: {
            include: {
              product: true,
              allowedVariants: {
                include: {
                  variant: {
                    include: { inventory: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      bundles,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Admin: Create bundle
  async createBundle(input: CreateBundleInput) {
    // Validate products exist
    for (const item of input.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new NotFoundError('Product', item.productId);
      }

      // Validate allowed variants exist and belong to the product
      for (const varId of item.allowedVariantIds) {
        const variant = await prisma.variant.findFirst({
          where: { id: varId, productId: item.productId },
        });
        if (!variant) {
          throw new ConflictError(`Variant "${varId}" does not belong to product "${item.productId}"`);
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      const bundle = await tx.bundle.create({
        data: {
          name: input.name,
          nameAr: input.nameAr,
          description: input.description,
          image: input.image,
          price: input.price,
          sortOrder: input.sortOrder,
          isActive: true,
        },
      });

      for (const item of input.items) {
        const bundleItem = await tx.bundleItem.create({
          data: {
            bundleId: bundle.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        for (const variantId of item.allowedVariantIds) {
          await tx.bundleItemVariant.create({
            data: {
              bundleItemId: bundleItem.id,
              variantId,
            },
          });
        }
      }

      return bundle;
    });
  }

  // Admin: Update bundle basic info
  async updateBundle(id: string, input: UpdateBundleInput) {
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) {
      throw new NotFoundError('Bundle', id);
    }

    return await prisma.bundle.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.nameAr !== undefined && { nameAr: input.nameAr }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.image !== undefined && { image: input.image }),
        ...(input.price && { price: input.price }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  }

  // Admin: Soft delete toggle
  async toggleActive(id: string) {
    const bundle = await prisma.bundle.findUnique({ where: { id } });
    if (!bundle) {
      throw new NotFoundError('Bundle', id);
    }

    return await prisma.bundle.update({
      where: { id },
      data: { isActive: !bundle.isActive },
    });
  }
}

export const bundlesService = new BundlesService();
