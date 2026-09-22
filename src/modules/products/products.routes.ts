import { Router } from 'express';
import { productsController } from './products.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { publicRateLimiter, adminRateLimiter } from '../../middleware/rateLimiter.js';

// Public Storefront Routes
const publicRouter = Router();
publicRouter.get('/', publicRateLimiter, productsController.getPublicProducts);
publicRouter.get('/:id', publicRateLimiter, productsController.getPublicProductById);

// Admin Protected Routes
const adminRouter = Router();
adminRouter.use(requireAdmin, adminRateLimiter);

adminRouter.get('/', validateRequest({ query: productQuerySchema }), productsController.getAdminProducts);
adminRouter.post('/', validateRequest({ body: createProductSchema }), productsController.createProduct);
adminRouter.put('/:id', validateRequest({ body: updateProductSchema }), productsController.updateProduct);
adminRouter.patch('/:id/toggle', productsController.toggleActive);

export const publicProductRoutes = publicRouter;
export const adminProductRoutes = adminRouter;
