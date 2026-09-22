import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../types/errors.js';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './products.schemas.js';
import { parsePagination, createPaginationMeta } from '../../utils/pagination.js';
import { Prisma } from '@prisma/client';

export class ProductsService {
  // Public Storefront: Only active products, includes active variants and stock
  async getPublicProducts(query: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.ProductWhereInput = { isActive: true };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          variants: {
            where: { isActive: true },
            include: {
              inventory: {
                select: { quantity: true, lowStockAt: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        description: p.description,
        basePrice: p.basePrice,
        images: p.images,
        variants: p.variants.map((v) => ({
          id: v.id,
          size: v.size,
          sku: v.sku,
          price: v.price ?? p.basePrice,
          availableStock: v.inventory?.quantity ?? 0,
        })),
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Public Storefront: Single product detail
  async getPublicProductById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          include: {
            inventory: {
              select: { quantity: true, lowStockAt: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Product', id);
    }

    return {
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      description: product.description,
      basePrice: product.basePrice,
      images: product.images,
      variants: product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        sku: v.sku,
        price: v.price ?? product.basePrice,
        availableStock: v.inventory?.quantity ?? 0,
      })),
    };
  }

  // Admin: Get all products with filters
  async getAdminProducts(query: ProductQueryInput) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.ProductWhereInput = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameAr: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      }),
    ]);

    return {
      products,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  // Admin: Create product
  async createProduct(input: CreateProductInput) {
    return await prisma.product.create({
      data: {
        name: input.name,
        nameAr: input.nameAr,
        description: input.description,
        basePrice: input.basePrice,
        images: input.images,
        sortOrder: input.sortOrder,
        isActive: true,
      },
    });
  }

  // Admin: Update product
  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product', id);
    }

    return await prisma.product.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.nameAr !== undefined && { nameAr: input.nameAr }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.basePrice && { basePrice: input.basePrice }),
        ...(input.images && { images: input.images }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  }

  // Admin: Soft Delete Toggle
  async toggleActive(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    return await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }
}

export const productsService = new ProductsService();
