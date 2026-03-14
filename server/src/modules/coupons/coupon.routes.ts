import { Router } from 'express';
import {
    validateCouponHandler,
    getAvailableCoupons,
    listCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
} from '../../controllers/coupon.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// User routes (authenticated)
router.get('/available', authenticateToken, getAvailableCoupons);
router.post('/validate', authenticateToken, validateCouponHandler);

// Admin routes
router.get('/', ...adminGuard, listCoupons);
router.post('/', ...adminGuard, createCoupon);
router.put('/:id', ...adminGuard, updateCoupon);
router.delete('/:id', ...adminGuard, deleteCoupon);

export default router;
