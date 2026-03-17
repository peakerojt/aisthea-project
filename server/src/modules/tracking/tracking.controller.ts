import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';
import { t } from '../../i18n';
import { resolveRequestLocale } from '../../middlewares/locale.middleware';
import { trackingService } from './tracking.service';
import { publicTrackingSchema, updateOrderStatusSchema } from './tracking.validator';

const ADMIN_ROLES = new Set(['Admin', 'Super Admin']);

const isAdminUser = (roles: unknown): boolean => {
  const roleList = Array.isArray(roles) ? (roles as string[]) : [];
  return roleList.some((role: string) => ADMIN_ROLES.has(role));
};

export const trackingController = {
  /**
   * POST /api/tracking/public
   * Public order lookup — requires orderCode + phone/email.
   * No JWT needed. Brute-force mitigated by requiring exact contact match.
   */
  async publicTracking(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = resolveRequestLocale(req);
      const parsed = publicTrackingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'common:errors.validation',
          undefined,
          parsed.error.flatten(),
        );
      }

      const data = await trackingService.getPublicTracking(parsed.data.orderCode, parsed.data.contact);
      return res.json({
        success: true,
        messageKey: 'tracking:success.getPublicTracking',
        message: t(locale, 'tracking:success.getPublicTracking'),
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/tracking/lookup?orderCode=...&contact=...
   * Alternative GET-based public lookup (supports ?phone= or ?email= too).
   */
  async publicTrackingGet(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = resolveRequestLocale(req);
      const orderCode = String(req.query.orderCode || req.query.orderId || '').trim();
      const contact = String(req.query.phone || req.query.email || req.query.contact || '').trim();

      if (!orderCode || orderCode.length < 4) {
        throw new AppError(400, 'VALIDATION_ERROR', 'common:errors.validation');
      }
      if (!contact || contact.length < 4) {
        throw new AppError(400, 'VALIDATION_ERROR', 'common:errors.validation');
      }

      const data = await trackingService.getPublicTracking(orderCode, contact);
      return res.json({
        success: true,
        messageKey: 'tracking:success.getPublicTracking',
        message: t(locale, 'tracking:success.getPublicTracking'),
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getOrderTracking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const locale = resolveRequestLocale(req);
      if (!req.user?.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'common:errors.unauthorized');
      }

      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        throw new AppError(400, 'INVALID_ORDER_ID', 'tracking:errors.invalidOrderId');
      }

      const isAdmin = isAdminUser(req.user.roles);
      const data = await trackingService.getOrderTrackingById(orderId, {
        userId: req.user.userId,
        isAdmin,
      });

      return res.json({
        success: true,
        messageKey: 'tracking:success.getOrderTracking',
        message: t(locale, 'tracking:success.getOrderTracking'),
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/admin/orders/:id/status
   * Admin alias for order fulfillment updates.
   * Core flow is order-first: Shipping does not require carrier/tracking metadata.
   */
  async adminUpdateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const locale = resolveRequestLocale(req);
      if (!req.user?.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'common:errors.unauthorized');
      }

      const isAdmin = isAdminUser(req.user.roles);
      if (!isAdmin) {
        throw new AppError(403, 'FORBIDDEN', 'tracking:errors.adminOnly');
      }

      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        throw new AppError(400, 'INVALID_ORDER_ID', 'tracking:errors.invalidOrderId');
      }

      const parsed = updateOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'common:errors.validation',
          undefined,
          parsed.error.flatten(),
        );
      }

      const updated = await trackingService.updateOrderStatus(orderId, parsed.data, req.user.userId);
      return res.json({
        success: true,
        messageKey: 'tracking:success.updateStatus',
        message: t(locale, 'tracking:success.updateStatus', { status: parsed.data.status }),
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },
};
