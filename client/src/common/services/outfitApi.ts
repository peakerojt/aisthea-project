import { api } from '@/common/utils/api';
import { OutfitProfile, OutfitRecommendation } from '@/types/outfit';
import { WeatherResponse } from '@/types/weather';

export const requestOutfitRecommendation = async ({
  weather,
  seasonContext,
  profile,
}: {
  weather: WeatherResponse;
  seasonContext: string;
  profile?: OutfitProfile;
}) => {
  const res = await api.post<{ success: boolean; data: OutfitRecommendation }>(
    '/api/outfit/recommend',
    {
      weather,
      seasonContext,
      profile,
    },
  );

  return (res as { data?: OutfitRecommendation }).data ?? (res as unknown as OutfitRecommendation);
};
