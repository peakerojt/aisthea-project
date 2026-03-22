import type { WeatherResponse } from './weather';

export interface OutfitProfile {
  gender?: string;
  style?: string;
  tolerance?: 'low' | 'medium' | 'high';
  occasion?: string;
}

export interface OutfitLocationInput {
  city?: string;
  lat?: number;
  lon?: number;
  hemisphere?: 'north' | 'south';
}

export interface OutfitRecommendation {
  summary: string;
  items: {
    top: string;
    bottom: string;
    shoes: string;
    accessories: string[];
  };
  tips: string[];
  warnings: string[];
}

export interface OutfitRecommendationResponse {
  weather: WeatherResponse;
  recommendation: OutfitRecommendation;
}
