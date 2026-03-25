import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createReviewSchema } from '../../shared/validation/schemas/review';

const router = Router();

/** POST /api/reviews */
router.post('/', authenticateToken, validate(createReviewSchema), reviewController.create);

/** GET /api/reviews/product/:productId */
router.get('/product/:productId', reviewController.getByProduct);

export default router;
