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
import { validate } from '../../middlewares/validate.middleware';
import {
    couponIdParamSchema,
    couponListQuerySchema,
    createCouponSchema,
    updateCouponSchema,
    validateCouponRequestSchema,
} from '../../shared/validation/schemas/coupon';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// User routes (authenticated)
router.get('/available', authenticateToken, getAvailableCoupons);
router.post('/validate', authenticateToken, validate(validateCouponRequestSchema), validateCouponHandler);

// Admin routes
router.get('/', ...adminGuard, validate(couponListQuerySchema, 'query'), listCoupons);
router.post('/', ...adminGuard, validate(createCouponSchema), createCoupon);
router.put('/:id', ...adminGuard, validate(couponIdParamSchema, 'params'), validate(updateCouponSchema), updateCoupon);
router.delete('/:id', ...adminGuard, validate(couponIdParamSchema, 'params'), deleteCoupon);

export default router;
