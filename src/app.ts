import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';

// Route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { publicProductRoutes, adminProductRoutes } from './modules/products/products.routes.js';
import { adminVariantRoutes } from './modules/variants/variants.routes.js';
import { adminInventoryRoutes } from './modules/inventory/inventory.routes.js';
import { publicBundleRoutes, adminBundleRoutes } from './modules/bundles/bundles.routes.js';
import { publicShippingRoutes, adminShippingRoutes } from './modules/shipping/shipping.routes.js';
import { publicOrderRoutes, adminOrderRoutes } from './modules/orders/orders.routes.js';
import { adminDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { adminUploadRoutes } from './modules/uploads/uploads.routes.js';

export const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoints
app.get('/health', (req, res) => sendSuccess(res, { status: 'healthy', timestamp: new Date() }));
app.get('/api/health', (req, res) => sendSuccess(res, { status: 'healthy', timestamp: new Date() }));

// 1. Auth routes
app.use('/api/admin/auth', authRoutes);

// 2. Catalog (Products & Variants)
app.use('/api/products', publicProductRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/variants', adminVariantRoutes);

// 3. Inventory
app.use('/api/admin/inventory', adminInventoryRoutes);

// 4. Bundles
app.use('/api/bundles', publicBundleRoutes);
app.use('/api/admin/bundles', adminBundleRoutes);

// 5. Shipping
app.use('/api/shipping', publicShippingRoutes);
app.use('/api/admin/shipping', adminShippingRoutes);

// 6. Orders
app.use('/api/orders', publicOrderRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// 7. Dashboard
app.use('/api/admin/dashboard', adminDashboardRoutes);

// 8. Uploads (Cloudflare R2)
app.use('/api/admin/uploads', adminUploadRoutes);

// 404 Handler
app.use((req, res) => {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, 404);
});

// Centralized Error Handler
app.use(errorHandler);
