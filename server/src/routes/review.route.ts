import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    createReview,
    getReviewsByProduct,
} from '../controllers/review.controller';

const router = Router();

// POST /api/reviews — requires authentication (validates ownership + delivered order internally)
router.post('/', authenticateToken, createReview);

// GET /api/reviews/product/:productId — public
router.get('/product/:productId', getReviewsByProduct);

export default router;