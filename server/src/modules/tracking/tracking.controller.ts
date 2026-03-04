import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';
import { trackingService } from './tracking.service';
import { publicTrackingSchema, updateOrderStatusSchema } from './tracking.validator';

const ADMIN_ROLES = new Set(['Admin', 'Super Admin']);

const isAdminUser = (roles: unknown): boolean => {
  const roleList = Array.isArray(roles) ? (roles as string[]) : [];
  return roleList.some((role: string) => ADMIN_ROLES.has(role));
};

export const trackingController = {
  async publicTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = publicTrackingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
      }

      const data = await trackingService.getPublicTracking(parsed.data.orderCode, parsed.data.contact);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const orders = await trackingService.getMyOrders(req.user.userId);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },

  async getOrderTracking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        throw new AppError(400, 'INVALID_ORDER_ID', 'Invalid order id');
      }

      const isAdmin = isAdminUser(req.user.roles);
      const data = await trackingService.getOrderTrackingById(orderId, {
        userId: req.user.userId,
        isAdmin,
      });

      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async adminUpdateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
      }

      const isAdmin = isAdminUser(req.user.roles);
      if (!isAdmin) {
        throw new AppError(403, 'FORBIDDEN', 'Admin only');
      }

      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        throw new AppError(400, 'INVALID_ORDER_ID', 'Invalid order id');
      }

      const parsed = updateOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten());
      }

      const updated = await trackingService.updateOrderStatus(orderId, parsed.data, req.user.userId);
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
};
