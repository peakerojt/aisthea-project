import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { trackingController } from './tracking.controller';

const trackingRouter = Router();

// Rate limiter: max 20 public lookup attempts per IP per 15 minutes
const publicLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Quá nhiều yêu cầu tra cứu. Vui lòng thử lại sau 15 phút.',
    },
});

// ── Public endpoints — no JWT required ────────────────────────────────────────
trackingRouter.post('/tracking/public', publicLookupLimiter, trackingController.publicTracking);
trackingRouter.get('/tracking/lookup', publicLookupLimiter, trackingController.publicTrackingGet);

// ── Authenticated endpoints ────────────────────────────────────────────────────
// NOTE: /api/orders/:id/tracking for authenticated lookup
trackingRouter.get('/orders/:id/tracking', authenticateToken, trackingController.getOrderTracking);

// REMOVED: PATCH /admin/orders/:id/status — handled by order.controller.ts (order.routes.ts)
// REMOVED: GET /orders/my — handled by order.controller.ts (order.routes.ts)

export default trackingRouter;

