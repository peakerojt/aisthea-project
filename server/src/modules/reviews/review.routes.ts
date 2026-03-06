import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();

/** POST /api/reviews */
router.post('/', authenticateToken, reviewController.create);

/** GET /api/reviews/product/:productId */
router.get('/product/:productId', reviewController.getByProduct);

export default router;
