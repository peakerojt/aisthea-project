import { WeatherWithSeason } from './weather.types';

export interface OutfitProfileInput {
  gender?: string;
  style?: string;
  tolerance?: 'low' | 'medium' | 'high';
  occasion?: string;
}

export interface OutfitLocationInput {
  lat?: number;
  lon?: number;
  city?: string;
  hemisphere?: 'north' | 'south';
}

export interface OutfitRecommendRequest {
  location: OutfitLocationInput;
  profile?: OutfitProfileInput;
}

export interface OutfitRecommendInput {
  weather: WeatherWithSeason;
  profile?: OutfitProfileInput;
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
