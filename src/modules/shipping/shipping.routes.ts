import { Router } from 'express';
import { shippingController } from './shipping.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { updateShippingZoneSchema } from './shipping.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { publicRateLimiter, adminRateLimiter } from '../../middleware/rateLimiter.js';

// Public Storefront Routes
const publicRouter = Router();
publicRouter.get('/zones', publicRateLimiter, shippingController.getPublicZones);

// Admin Protected Routes
const adminRouter = Router();
adminRouter.use(requireAdmin, adminRateLimiter);

adminRouter.get('/zones', shippingController.getAllAdminZones);
adminRouter.put('/zones/:id', validateRequest({ body: updateShippingZoneSchema }), shippingController.updateZone);
adminRouter.patch('/zones/:id/toggle', shippingController.toggleActive);

export const publicShippingRoutes = publicRouter;
export const adminShippingRoutes = adminRouter;
