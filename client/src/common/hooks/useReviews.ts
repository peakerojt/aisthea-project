import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getReviewsByProduct,
    createReview,
    CreateReviewPayload,
} from '@/common/services/review.service';

export const reviewKeys = {
    all: ['reviews'] as const,
    byProduct: (productId: number) => [...reviewKeys.all, 'product', productId] as const,
};

/** Fetch all reviews for a product — used in product detail page */
export const useProductReviews = (productId: number) => {
    return useQuery({
        queryKey: reviewKeys.byProduct(productId),
        queryFn: () => getReviewsByProduct(productId),
        enabled: !!productId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/** Mutation: create a review after purchase */
export const useCreateReview = (productId?: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateReviewPayload) => createReview(payload),
        onSuccess: () => {
            if (productId) {
                queryClient.invalidateQueries({ queryKey: reviewKeys.byProduct(productId) });
            } else {
                queryClient.invalidateQueries({ queryKey: reviewKeys.all });
            }
        },
    });
};
