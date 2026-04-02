import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { createCustomerMutationRateLimiters } from '../../middlewares/security.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createReviewSchema } from '../../shared/validation/schemas/review';

const router = Router();
const createReviewRateLimiters = createCustomerMutationRateLimiters('review.create');

/** POST /api/reviews */
router.post('/', authenticateToken, ...createReviewRateLimiters, validate(createReviewSchema), reviewController.create);

/** GET /api/reviews/product/:productId */
router.get('/product/:productId', reviewController.getByProduct);

export default router;
