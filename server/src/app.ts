import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';

// ─── Security ─────────────────────────────────────────────────────────────────
import {
  applyCsrfProtection,
  applyHelmet,
  applyPermissionsPolicy,
  attachRateLimitIdentity,
  createAdminRateLimiters,
  globalRateLimiter,
} from './middlewares/security.middleware';
import { localeMiddleware } from './middlewares/locale.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { responseNormalizer } from './middlewares/response.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { markLegacyCompatibilityRoute } from './middlewares/legacy-compatibility.middleware';

// ─── Module-owned routes ───────────────────────────────────────────────────────
import authModuleRoutes from './modules/auth/auth.routes';
import productModuleRoutes from './modules/products/product.routes';
import importExportRoutes from './modules/products/importExport.routes';
import categoryModuleRoutes from './modules/categories/category.routes';
import reviewModuleRoutes from './modules/reviews/review.routes';
import cartModuleRoutes from './modules/cart/cart.routes';
import inventoryModuleRoutes from './modules/inventory/inventory.routes';
import purchaseOrderModuleRoutes from './modules/purchase-orders/purchase-order.routes';
import couponModuleRoutes from './modules/coupons/coupon.routes';
import userModuleRoutes from './modules/users/user.routes';
import dashboardModuleRoutes from './modules/dashboard/dashboard.routes';
import analyticsModuleRoutes from './modules/analytics/analytics.routes';
import { vnpayModuleRoutes, refundModuleRoutes } from './modules/payments/payment.routes';
import weatherRoutes from './modules/weather/weather.routes';
import outfitRoutes from './modules/outfit/outfit.routes';
import chatRoutes from './modules/chat/chat.routes';

// ─── Deferred migration areas (intentionally out of this cleanup wave) ────────
import orderModuleRoutes from './modules/order/order.route';
import trackingRouter from './modules/tracking/tracking.route';
import { trackingController } from './modules/tracking/tracking.controller';
import itemsRouter from './modules/items/items.route';
import returnOrderRoutes from './modules/return-order/routes/routes';

// ─── Remaining legacy routes (thin — keep until full migration) ───────────────
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import orderRoutes from './routes/order.routes';

import { authenticateToken } from './middlewares/auth.middleware';
import { getOrderReturn } from './controllers/legacy-returns.controller';
import { env } from './lib/env';
import { queryCountMiddleware } from './lib/query-monitor';

export function createApp() {
  const app = express();
  const adminOrderStatusRateLimiters = createAdminRateLimiters('admin.orders.status');
  const legacyOrderReturnRoute = markLegacyCompatibilityRoute({
    successor: '/api/return-requests',
    surface: 'legacy-order-return',
  });
  const legacyOrderRefundsRoute = markLegacyCompatibilityRoute({
    successor: '/api/return-requests/admin/:id/refund',
    surface: 'legacy-order-refunds',
  });

  // ── Passport ────────────────────────────────────────────────────────────────
  configureGoogleStrategy();
  app.use(passport.initialize());

  // ── Security headers ─────────────────────────────────────────────────────────
  app.use(applyHelmet);
  app.use(applyPermissionsPolicy);

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-lang', 'accept-language', 'x-csrf-token'],
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(applyCsrfProtection(env.clientUrl, env.nodeEnv));

  // ── Locale ────────────────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(localeMiddleware);
  app.use('/api', responseNormalizer);
  app.use(queryCountMiddleware);

  // ── Global rate limiter ───────────────────────────────────────────────────────
  app.use('/api', attachRateLimitIdentity);
  app.use('/api/', globalRateLimiter);

  // ── Module-owned domains ─────────────────────────────────────────────────────
  app.use('/api/auth', authModuleRoutes);
  app.use('/api/products', productModuleRoutes);
  app.use('/api/products', importExportRoutes);   // /export, /import under products
  app.use('/api/categories', categoryModuleRoutes);
  app.use('/api/reviews', reviewModuleRoutes);
  app.use('/api/cart', cartModuleRoutes);
  app.use('/api/inventory', inventoryModuleRoutes);
  app.use('/api/purchase-orders', purchaseOrderModuleRoutes);
  app.use('/api/coupons', couponModuleRoutes);
  app.use('/api/users', userModuleRoutes);
  app.use('/api/dashboard', dashboardModuleRoutes);
  app.use('/api/analytics', analyticsModuleRoutes);
  app.use('/api/vnpay', vnpayModuleRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/outfit', outfitRoutes);
  app.use('/api/chat', chatRoutes);

  // ── Order/payment/return routes — left as-is during this cleanup wave ───────
  // ORDERING MATTERS: named paths before catch-all /:id
  // Backward-compatible tracking endpoints expected by legacy i18n tests.
  app.patch(
    '/api/admin/orders/:id/status',
    authenticateToken,
    ...adminOrderStatusRateLimiters,
    trackingController.adminUpdateOrderStatus,
  );
  app.use('/api/orders', orderRoutes);            // /admin, /my, /my/:id, POST /, PATCH /:id/status
  app.get('/api/orders/:id/return', legacyOrderReturnRoute, authenticateToken, getOrderReturn);
  app.use('/api/orders', legacyOrderRefundsRoute, refundModuleRoutes);     // /:id/refunds
  app.use('/api/orders', orderModuleRoutes);      // /:id (catch-all detail / cancel)

  // Return/refund management (deferred migration)
  app.use('/api', trackingRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/return-requests', returnOrderRoutes);

  // Roles & permissions (Admin RBAC)
  app.use('/api/roles', roleRoutes);
  app.use('/api/permissions', permissionRoutes);

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'AISTHEA API Server 🚀', version: '2.2.0' });
  });

  // ── Error handling (must be last) ─────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

