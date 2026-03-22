import { api } from '@/common/utils/api';
import { OutfitLocationInput, OutfitProfile, OutfitRecommendationResponse } from '@/types/outfit';

export const requestOutfitRecommendation = async ({
    location,
    profile,
}: {
    location: OutfitLocationInput;
    profile?: OutfitProfile;
}) => {
    const res = await api.post<{ success: boolean; data: OutfitRecommendationResponse }>(
        '/api/outfit/recommend',
        {
            location,
            profile,
        },
    );

    return (res as { data?: OutfitRecommendationResponse }).data ?? (res as unknown as OutfitRecommendationResponse);
};
