import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import importExportRoutes from './routes/importExport.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import orderModuleRoutes from './modules/order/order.route';
import reviewRoutes from './routes/review.route';
import categoryRoutes from './routes/category.routes';
import inventoryRoutes from './routes/inventory.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import vnpayRoutes from './routes/vnpay.routes';
import couponRoutes from './routes/coupon.routes';
import cartRoutes from './routes/cart.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import trackingRouter from './modules/tracking/tracking.route';
import itemsRouter from './modules/items/items.route';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import returnRoutes from './routes/return.routes';
import refundRoutes from './routes/refund.routes';
import { authenticateToken } from './middlewares/auth.middleware';
import { postReturnRequest, getOrderReturn } from './controllers/return.controller';
import { localeMiddleware } from './middlewares/locale.middleware';

dotenv.config();

export function createApp() {
  const app = express();

  configureGoogleStrategy();
  app.use(passport.initialize());

  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-lang', 'accept-language'],
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(localeMiddleware);

  app.use('/api/auth', authRoutes);
  app.use('/api/products', importExportRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/vnpay', vnpayRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/permissions', permissionRoutes);
  app.use('/api/reviews', reviewRoutes);

  app.use('/api/orders', orderRoutes);

  app.post('/api/orders/:id/return', authenticateToken, postReturnRequest);
  app.get('/api/orders/:id/return', authenticateToken, getOrderReturn);
  app.use('/api/orders', refundRoutes);
  app.use('/api/returns', returnRoutes);

  app.use('/api/orders', orderModuleRoutes);
  app.use('/api', trackingRouter);
  app.use('/api/items', itemsRouter);

  app.use('/api/users', userRoutes);

  app.get('/', (_req: Request, res: Response) => {
    res.send('<h1>Server SQL Server connected successfully! 🚀</h1>');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
