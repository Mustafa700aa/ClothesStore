import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { restockSchema, adjustStockSchema, inventoryQuerySchema } from './inventory.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { adminRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
router.use(requireAdmin, adminRateLimiter);

router.get('/', validateRequest({ query: inventoryQuerySchema }), inventoryController.getAllStock);
router.get('/low-stock', inventoryController.getLowStockAlerts);
router.post('/:variantId/restock', validateRequest({ body: restockSchema }), inventoryController.restock);
router.post('/:variantId/adjust', validateRequest({ body: adjustStockSchema }), inventoryController.adjustStock);
router.get('/:variantId/logs', inventoryController.getLogs);

export const adminInventoryRoutes = router;
