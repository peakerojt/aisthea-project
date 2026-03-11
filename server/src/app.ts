import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';

// ─── Security ─────────────────────────────────────────────────────────────────
import { applyHelmet, globalRateLimiter } from './middlewares/security.middleware';
import { localeMiddleware } from './middlewares/locale.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// ─── Modular Architecture — new module routes ─────────────────────────────────
import authModuleRoutes from './modules/auth/auth.routes';
import productModuleRoutes from './modules/products/product.routes';
import importExportRoutes from './modules/products/importExport.routes';
import categoryModuleRoutes from './modules/categories/category.routes';
import reviewModuleRoutes from './modules/reviews/review.routes';
import cartModuleRoutes from './modules/cart/cart.routes';
import inventoryModuleRoutes from './modules/inventory/inventory.routes';
import warehouseModuleRoutes from './modules/warehouses/warehouse.routes';
import couponModuleRoutes from './modules/coupons/coupon.routes';
import userModuleRoutes from './modules/users/user.routes';
import dashboardModuleRoutes from './modules/dashboard/dashboard.routes';
import analyticsModuleRoutes from './modules/analytics/analytics.routes';
import { vnpayModuleRoutes, refundModuleRoutes } from './modules/payments/payment.routes';
import weatherRoutes from './modules/weather/weather.routes';
import outfitRoutes from './modules/outfit/outfit.routes';

// ─── Legacy module routes (migrated but still in /modules sub-folder) ─────────
import orderModuleRoutes from './modules/order/order.route';
import trackingRouter from './modules/tracking/tracking.route';
import itemsRouter from './modules/items/items.route';
import returnOrderRoutes from './modules/return-order/routes/return-request.routes';

// ─── Remaining legacy routes (thin — keep until full migration) ───────────────
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import returnRoutes from './routes/return.routes';
import orderRoutes from './routes/order.routes';

import { authenticateToken } from './middlewares/auth.middleware';
import { postReturnRequest, getOrderReturn } from './controllers/return.controller';
import { env } from './lib/env';

export function createApp() {
  const app = express();

  // ── Passport ────────────────────────────────────────────────────────────────
  configureGoogleStrategy();
  app.use(passport.initialize());

  // ── Security headers ─────────────────────────────────────────────────────────
  app.use(applyHelmet);

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-lang', 'accept-language'],
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ── Locale ────────────────────────────────────────────────────────────────────
  app.use(localeMiddleware);

  // ── Global rate limiter ───────────────────────────────────────────────────────
  app.use('/api/', globalRateLimiter);

  // ── Core Modular Routes ───────────────────────────────────────────────────────
  app.use('/api/auth', authModuleRoutes);
  app.use('/api/products', productModuleRoutes);
  app.use('/api/products', importExportRoutes);   // /export, /import under products
  app.use('/api/categories', categoryModuleRoutes);
  app.use('/api/reviews', reviewModuleRoutes);
  app.use('/api/cart', cartModuleRoutes);
  app.use('/api/inventory', inventoryModuleRoutes);
  app.use('/api/warehouses', warehouseModuleRoutes);
  app.use('/api/coupons', couponModuleRoutes);
  app.use('/api/users', userModuleRoutes);
  app.use('/api/dashboard', dashboardModuleRoutes);
  app.use('/api/analytics', analyticsModuleRoutes);
  app.use('/api/vnpay', vnpayModuleRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/outfit', outfitRoutes);

  // ── Order routes — ORDERING MATTERS: named paths before catch-all /:id ────────
  app.use('/api/orders', orderRoutes);            // /admin, /my, /my/:id, POST /, PATCH /:id/status
  app.post('/api/orders/:id/return', authenticateToken, postReturnRequest);
  app.get('/api/orders/:id/return', authenticateToken, getOrderReturn);
  app.use('/api/orders', refundModuleRoutes);     // /:id/refunds
  app.use('/api/orders', orderModuleRoutes);      // /:id (catch-all detail / cancel)

  // Return/refund management (legacy module routes)
  app.use('/api', trackingRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/return-requests', returnOrderRoutes);
  app.use('/api/returns', returnRoutes);

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
