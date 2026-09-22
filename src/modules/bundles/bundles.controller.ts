import { Request, Response, NextFunction } from 'express';
import { bundlesService } from './bundles.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class BundlesController {
  async getPublicBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bundlesService.getPublicBundles(req.query);
      return sendSuccess(res, result.bundles, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getPublicBundleById(req: Request, res: Response, next: NextFunction) {
    try {
      const bundle = await bundlesService.getPublicBundleById(req.params.id);
      return sendSuccess(res, bundle);
    } catch (error) {
      next(error);
    }
  }

  async getAllAdminBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bundlesService.getAllAdminBundles(req.query);
      return sendSuccess(res, result.bundles, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async createBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const bundle = await bundlesService.createBundle(req.body);
      return sendSuccess(res, bundle, 'Bundle created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const bundle = await bundlesService.updateBundle(req.params.id, req.body);
      return sendSuccess(res, bundle, 'Bundle updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const bundle = await bundlesService.toggleActive(req.params.id);
      const statusText = bundle.isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, bundle, `Bundle ${statusText} successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export const bundlesController = new BundlesController();
