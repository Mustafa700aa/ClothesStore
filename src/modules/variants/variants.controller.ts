import { Request, Response, NextFunction } from 'express';
import { variantsService } from './variants.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class VariantsController {
  async getByProductId(req: Request, res: Response, next: NextFunction) {
    try {
      const variants = await variantsService.getByProductId(req.params.productId);
      return sendSuccess(res, variants);
    } catch (error) {
      next(error);
    }
  }

  async createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await variantsService.createVariant(req.body);
      return sendSuccess(res, variant, 'Variant created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await variantsService.updateVariant(req.params.id, req.body);
      return sendSuccess(res, variant, 'Variant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await variantsService.toggleActive(req.params.id);
      const statusText = variant.isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, variant, `Variant ${statusText} successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export const variantsController = new VariantsController();
