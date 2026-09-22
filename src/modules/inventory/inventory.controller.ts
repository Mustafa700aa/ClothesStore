import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class InventoryController {
  async getAllStock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getAllStock(req.query as never);
      return sendSuccess(res, result.inventories, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getLowStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await inventoryService.getLowStockAlerts();
      return sendSuccess(res, alerts);
    } catch (error) {
      next(error);
    }
  }

  async restock(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await inventoryService.restock(req.params.variantId, req.body);
      return sendSuccess(res, updated, 'Stock replenished successfully');
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await inventoryService.adjustStock(req.params.variantId, req.body);
      return sendSuccess(res, updated, 'Stock adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getLogs(req.params.variantId, req.query);
      return sendSuccess(res, result.logs, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
