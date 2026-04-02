import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { createPublicReadRateLimiters } from '../../middlewares/security.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { trackingController } from './tracking.controller';
import { publicTrackingSchema } from './tracking.validator';

const trackingRouter = Router();
const publicLookupRateLimiters = createPublicReadRateLimiters('tracking.public-lookup');

// ── Public endpoints — no JWT required ────────────────────────────────────────
trackingRouter.post(
  '/tracking/public',
  ...publicLookupRateLimiters,
  validate(publicTrackingSchema),
  trackingController.publicTracking,
);
trackingRouter.get(
  '/tracking/lookup',
  ...publicLookupRateLimiters,
  validate(publicTrackingSchema, 'query'),
  trackingController.publicTrackingGet,
);

// ── Authenticated endpoints ────────────────────────────────────────────────────
// NOTE: /api/orders/:id/tracking for authenticated lookup
trackingRouter.get('/orders/:id/tracking', authenticateToken, trackingController.getOrderTracking);

// REMOVED: PATCH /admin/orders/:id/status — handled by order.controller.ts (order.routes.ts)
// REMOVED: GET /orders/my — handled by order.controller.ts (order.routes.ts)

export default trackingRouter;

