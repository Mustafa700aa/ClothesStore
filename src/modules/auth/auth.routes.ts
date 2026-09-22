import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { loginSchema, updatePasswordSchema } from './auth.schemas.js';
import { requireAdmin } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Public route for Admin Login
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), authController.login);

// Protected routes (Super Admin only)
router.get('/profile', requireAdmin, authController.getProfile);
router.put('/password', requireAdmin, validateRequest({ body: updatePasswordSchema }), authController.updatePassword);

export const authRoutes = router;
