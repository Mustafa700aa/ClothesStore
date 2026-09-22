import { Router } from 'express';
import { ordersController } from './orders.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema, appendNoteSchema } from './orders.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { orderRateLimiter, adminRateLimiter, publicRateLimiter } from '../../middleware/rateLimiter.js';

// Public Storefront Routes
const publicRouter = Router();
publicRouter.post('/', orderRateLimiter, validateRequest({ body: createOrderSchema }), ordersController.createOrder);
publicRouter.get('/:orderNumber/track', publicRateLimiter, ordersController.trackOrder);

// Admin Protected Routes
const adminRouter = Router();
adminRouter.use(requireAdmin, adminRateLimiter);

adminRouter.get('/', validateRequest({ query: orderQuerySchema }), ordersController.getAdminOrders);
adminRouter.get('/:id', ordersController.getAdminOrderById);
adminRouter.patch('/:id/status', validateRequest({ body: updateOrderStatusSchema }), ordersController.updateStatus);
adminRouter.patch('/:id/notes', validateRequest({ body: appendNoteSchema }), ordersController.updateNotes);

export const publicOrderRoutes = publicRouter;
export const adminOrderRoutes = adminRouter;
