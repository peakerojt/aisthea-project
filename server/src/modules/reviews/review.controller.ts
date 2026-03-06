import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const reviewController = {
    create: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthenticated.' });
            const review = await reviewService.createReview(userId, req.body);
            res.status(201).json({ success: true, data: review, message: 'Review created.' });
        } catch (err) { next(err); }
    },

    getByProduct: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const productId = parseInt(req.params.productId as string, 10);
            if (isNaN(productId)) return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid product ID.' });
            const reviews = await reviewService.getByProduct(productId);
            res.json({ success: true, data: { reviews, total: reviews.length }, message: 'OK' });
        } catch (err) { next(err); }
    },
};
