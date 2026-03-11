import { api } from '@/common/utils/api';
import { CreateReviewPayload, ReviewResponse } from '@/common/services/review.service';

export const reviewApi = {
    getByProduct: (productId: number) => api.get<{ success?: boolean; data: { reviews: ReviewResponse[]; total: number } }>(`/api/reviews/product/${productId}`),

    create: (payload: CreateReviewPayload) => api.post<{ success: boolean; data: ReviewResponse }>('/api/reviews', payload)
};
