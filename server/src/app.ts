import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import orderModuleRoutes from './modules/order/order.route';
import categoryRoutes from './routes/category.routes';
import inventoryRoutes from './routes/inventory.routes';

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
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/inventory', inventoryRoutes);

  // Keep existing routes for backward compatibility
  app.use('/api/orders', orderRoutes);
  // New production-ready endpoints
  app.use('/api/orders', orderModuleRoutes);

  app.use('/api/users', userRoutes);

  app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Server SQL Server đã kết nối thành công! 🚀</h1>');
  });

  return app;
}

