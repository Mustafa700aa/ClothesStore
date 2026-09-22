import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class ProductsController {
  async getPublicProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.getPublicProducts(req.query);
      return sendSuccess(res, result.products, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getPublicProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getPublicProductById(req.params.id);
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  async getAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.getAdminProducts(req.query as never);
      return sendSuccess(res, result.products, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.createProduct(req.body);
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.updateProduct(req.params.id, req.body);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.toggleActive(req.params.id);
      const statusText = product.isActive ? 'activated' : 'deactivated';
      return sendSuccess(res, product, `Product ${statusText} successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export const productsController = new ProductsController();
