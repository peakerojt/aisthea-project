import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    validateCouponHandler,
    listCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
} from '../controllers/coupon.controller';

const router = Router();

// ── User route: validate a coupon code during checkout ────────────────────────
// POST /api/coupons/validate  (authenticated user)
router.post('/validate', authenticateToken, validateCouponHandler);

// ── Admin routes ──────────────────────────────────────────────────────────────
// GET    /api/coupons           — list all coupons
router.get('/', authenticateToken, listCoupons);
// POST   /api/coupons           — create coupon
router.post('/', authenticateToken, createCoupon);
// PUT    /api/coupons/:id       — update coupon
router.put('/:id', authenticateToken, updateCoupon);
// DELETE /api/coupons/:id       — soft-delete (deactivate)
router.delete('/:id', authenticateToken, deleteCoupon);

export default router;
