import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const reviewController = {
    create: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED' });
            const review = await reviewService.createReview(userId, req.body);
            res.status(201).json({ success: true, code: 'REVIEW_CREATED', data: review });
        } catch (err) { next(err); }
    },

    getByProduct: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const productId = parseInt(req.params.productId as string, 10);
            if (isNaN(productId)) return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_ID' });
            const reviews = await reviewService.getByProduct(productId);
            res.json({ success: true, code: 'OK', data: { reviews, total: reviews.length } });
        } catch (err) { next(err); }
    },
};
