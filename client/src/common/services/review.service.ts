import { reviewApi } from '@/common/api/review.api';

export interface CreateReviewPayload {
    orderItemId: number;
    productId: number;
    rating: number;
    comment?: string;
    images?: string[];
}

export interface ReviewResponse {
    reviewId: number;
    productId: number;
    orderItemId: number;
    rating: number;
    comment: string | null;
    images: string[];
    createdAt: string;
}


// GET /api/reviews/product/:productId — public
export const getReviewsByProduct = async (productId: number) => {
    const res = await reviewApi.getByProduct(productId);
    // Backward compatibility for components expecting direct object or unwrapped data
    return (res as any).data || res;
};

// POST /api/reviews — requires auth cookie
export const createReview = async (payload: CreateReviewPayload): Promise<ReviewResponse> => {
    const res = await reviewApi.create(payload);
    return (res as any).data || (res as any).review || res as unknown as ReviewResponse;
};