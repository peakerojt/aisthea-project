import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';

// ─── Security ─────────────────────────────────────────────────────────────────
import { applyHelmet, globalRateLimiter } from './middlewares/security.middleware';

// ─── Locale ───────────────────────────────────────────────────────────────────
import { localeMiddleware } from './middlewares/locale.middleware';

// ─── Error handling ───────────────────────────────────────────────────────────
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// ─── New Module Routes ────────────────────────────────────────────────────────
import authModuleRoutes from './modules/auth/auth.routes';
import productModuleRoutes from './modules/products/product.routes';
import categoryModuleRoutes from './modules/categories/category.routes';
import reviewModuleRoutes from './modules/reviews/review.routes';

// ─── Existing legacy module routes (unchanged) ────────────────────────────────
import orderModuleRoutes from './modules/order/order.route';
import trackingRouter from './modules/tracking/tracking.route';
import itemsRouter from './modules/items/items.route';
import returnOrderRoutes from './modules/return-order/routes/return-request.routes';

// ─── Remaining legacy routes (will be migrated in future sprints) ─────────────
import importExportRoutes from './routes/importExport.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import inventoryRoutes from './routes/inventory.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import vnpayRoutes from './routes/vnpay.routes';
import couponRoutes from './routes/coupon.routes';
import cartRoutes from './routes/cart.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import returnRoutes from './routes/return.routes';
import refundRoutes from './routes/refund.routes';
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

  // ── Global rate limiter (applied to all API routes) ───────────────────────────
  app.use('/api/', globalRateLimiter);

  // ── New Module Routes ─────────────────────────────────────────────────────────
  app.use('/api/auth', authModuleRoutes);
  app.use('/api/products', productModuleRoutes);
  app.use('/api/categories', categoryModuleRoutes);
  app.use('/api/reviews', reviewModuleRoutes);

  // ── Existing fully featured module routes ─────────────────────────────────────
  app.use('/api/orders', orderModuleRoutes);
  app.use('/api', trackingRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api', returnOrderRoutes);

  // ── Legacy routes (kept as-is, to be migrated per sprint) ────────────────────
  app.use('/api/products', importExportRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/vnpay', vnpayRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/permissions', permissionRoutes);
  app.use('/api/orders', orderRoutes);

  // Return request inline handlers (legacy – kept until return module is migrated)
  app.post('/api/orders/:id/return', authenticateToken, postReturnRequest);
  app.get('/api/orders/:id/return', authenticateToken, getOrderReturn);
  app.use('/api/orders', refundRoutes);
  app.use('/api/returns', returnRoutes);

  app.use('/api/users', userRoutes);

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'AISTHEA API Server 🚀', version: '2.0.0' });
  });

  // ── Error handling (must be last) ─────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

