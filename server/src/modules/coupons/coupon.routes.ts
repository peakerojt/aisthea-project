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
import {
    createAdminRateLimiters,
    createCustomerMutationRateLimiters,
} from '../../middlewares/security.middleware';
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
const couponValidationRateLimiters = createCustomerMutationRateLimiters('coupon.validate');
const adminCouponMutationRateLimiters = createAdminRateLimiters('admin.coupons');

// User routes (authenticated)
router.get('/available', authenticateToken, getAvailableCoupons);
router.post('/validate', authenticateToken, ...couponValidationRateLimiters, validate(validateCouponRequestSchema), validateCouponHandler);

// Admin routes
router.get('/', ...adminGuard, validate(couponListQuerySchema, 'query'), listCoupons);
router.post('/', ...adminGuard, ...adminCouponMutationRateLimiters, validate(createCouponSchema), createCoupon);
router.put('/:id', ...adminGuard, ...adminCouponMutationRateLimiters, validate(couponIdParamSchema, 'params'), validate(updateCouponSchema), updateCoupon);
router.delete('/:id', ...adminGuard, ...adminCouponMutationRateLimiters, validate(couponIdParamSchema, 'params'), deleteCoupon);

export default router;
