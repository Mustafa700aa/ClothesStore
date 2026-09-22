import { Router } from 'express';
import { variantsController } from './variants.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createVariantSchema, updateVariantSchema } from './variants.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { adminRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
router.use(requireAdmin, adminRateLimiter);

router.get('/product/:productId', variantsController.getByProductId);
router.post('/', validateRequest({ body: createVariantSchema }), variantsController.createVariant);
router.put('/:id', validateRequest({ body: updateVariantSchema }), variantsController.updateVariant);
router.patch('/:id/toggle', variantsController.toggleActive);

export const adminVariantRoutes = router;
