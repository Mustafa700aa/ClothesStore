import { Router } from 'express';
import { bundlesController } from './bundles.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createBundleSchema, updateBundleSchema } from './bundles.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { publicRateLimiter, adminRateLimiter } from '../../middleware/rateLimiter.js';

// Public Storefront Routes
const publicRouter = Router();
publicRouter.get('/', publicRateLimiter, bundlesController.getPublicBundles);
publicRouter.get('/:id', publicRateLimiter, bundlesController.getPublicBundleById);

// Admin Protected Routes
const adminRouter = Router();
adminRouter.use(requireAdmin, adminRateLimiter);

adminRouter.get('/', bundlesController.getAllAdminBundles);
adminRouter.post('/', validateRequest({ body: createBundleSchema }), bundlesController.createBundle);
adminRouter.put('/:id', validateRequest({ body: updateBundleSchema }), bundlesController.updateBundle);
adminRouter.patch('/:id/toggle', bundlesController.toggleActive);

export const publicBundleRoutes = publicRouter;
export const adminBundleRoutes = adminRouter;
