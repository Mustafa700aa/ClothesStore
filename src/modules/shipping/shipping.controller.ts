import { Request, Response, NextFunction } from 'express';
import { shippingService } from './shipping.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class ShippingController {
  async getPublicZones(req: Request, res: Response, next: NextFunction) {
    try {
      const zones = await shippingService.getPublicZones();
      return sendSuccess(res, zones);
    } catch (error) {
      next(error);
    }
  }

  async getAllAdminZones(req: Request, res: Response, next: NextFunction) {
    try {
      const zones = await shippingService.getAllAdminZones();
      return sendSuccess(res, zones);
    } catch (error) {
      next(error);
    }
  }

  async updateZone(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await shippingService.updateZone(req.params.id, req.body);
      return sendSuccess(res, updated, 'Shipping zone updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await shippingService.toggleActive(req.params.id);
      const statusText = updated.isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, updated, `Shipping zone ${statusText} successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export const shippingController = new ShippingController();
