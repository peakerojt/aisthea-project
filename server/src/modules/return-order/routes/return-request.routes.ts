import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/auth.middleware';
import { ReturnRequestController } from '../controllers/return-request.controller';

const controller = new ReturnRequestController();
const router = Router();

const requireRoles = (allowed: string[]) => (req: any, res: any, next: any) => {
  const roles: string[] = (req.user?.roles || [req.user?.role || 'customer']).map((r: string) => r.toLowerCase());
  const canAccess = roles.some((role) => allowed.includes(role));
  if (!canAccess) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Không đủ quyền truy cập' },
    });
  }
  return next();
};

const createReturnRateLimit = (() => {
  const bucket = new Map<number, { count: number; resetAt: number }>();
  const WINDOW_MS = 60 * 1000;
  const MAX_REQUESTS = 5;

  return (req: any, res: any, next: any) => {
    const userId = Number(req.user?.userId || 0);
    if (!userId) return next();

    const now = Date.now();
    const current = bucket.get(userId);
    if (!current || now > current.resetAt) {
      bucket.set(userId, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    if (current.count >= MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' },
      });
    }

    current.count += 1;
    bucket.set(userId, current);
    return next();
  };
})();

router.post('/', authenticateToken, requireRoles(['customer', 'admin', 'support']), createReturnRateLimit, controller.create);
router.get('/my', authenticateToken, controller.myReturns);

router.get('/admin/list', authenticateToken, requireRoles(['admin', 'support']), controller.adminList);
router.patch('/admin/:id/approve', authenticateToken, requireRoles(['admin', 'support']), controller.approve);
router.patch('/admin/:id/reject', authenticateToken, requireRoles(['admin', 'support']), controller.reject);
router.patch('/admin/:id/mark-received', authenticateToken, requireRoles(['admin', 'support']), controller.markReceived);
router.patch('/admin/:id/refund', authenticateToken, requireRoles(['admin', 'support']), controller.refund);

router.get('/:id', authenticateToken, controller.detail);

export default router;
