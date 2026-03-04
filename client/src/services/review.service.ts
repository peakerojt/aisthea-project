import { httpClient } from './httpClient';

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
    const res = await httpClient.get<{ reviews: ReviewResponse[]; total: number }>(
        `/api/reviews/product/${productId}`
    );
    return res.data;
};

// POST /api/reviews — requires auth cookie
export const createReview = async (payload: CreateReviewPayload): Promise<ReviewResponse> => {
    const res = await httpClient.post<{ success: boolean; review: ReviewResponse }>(
        '/api/reviews',
        payload
    );
    return res.data.review;
};