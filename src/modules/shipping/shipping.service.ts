import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../types/errors.js';
import { UpdateShippingZoneInput } from './shipping.schemas.js';

export class ShippingService {
  async getPublicZones() {
    return await prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { shippingCost: 'asc' },
    });
  }

  async getAllAdminZones() {
    return await prisma.shippingZone.findMany({
      orderBy: { governorateEn: 'asc' },
    });
  }

  async getZoneById(id: string) {
    const zone = await prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundError('Shipping Zone', id);
    }
    return zone;
  }

  async updateZone(id: string, input: UpdateShippingZoneInput) {
    const zone = await prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundError('Shipping Zone', id);
    }

    return await prisma.shippingZone.update({
      where: { id },
      data: {
        ...(input.shippingCost !== undefined && { shippingCost: input.shippingCost }),
        ...(input.estimatedDays !== undefined && { estimatedDays: input.estimatedDays }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async toggleActive(id: string) {
    const zone = await prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundError('Shipping Zone', id);
    }

    return await prisma.shippingZone.update({
      where: { id },
      data: { isActive: !zone.isActive },
    });
  }
}

export const shippingService = new ShippingService();
