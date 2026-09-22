import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { dashboardLimitQuerySchema } from './dashboard.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { adminRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
router.use(requireAdmin, adminRateLimiter);

router.get('/overview', dashboardController.getOverview);
router.get('/revenue', dashboardController.getRevenue);
router.get('/top-products', validateRequest({ query: dashboardLimitQuerySchema }), dashboardController.getTopProducts);
router.get('/top-bundles', validateRequest({ query: dashboardLimitQuerySchema }), dashboardController.getTopBundles);
router.get('/governorates', dashboardController.getGovernorates);
router.get('/return-rate', dashboardController.getReturnRate);
router.get('/conversion', dashboardController.getConversion);
router.get('/pending-actions', dashboardController.getPendingActions);
router.get('/aov', dashboardController.getAverageOrderValue);
router.get('/repeat-customers', dashboardController.getRepeatCustomers);
router.get('/day-of-week', dashboardController.getDayOfWeek);
router.get('/governorate-returns', dashboardController.getGovernorateReturns);

export const adminDashboardRoutes = router;
