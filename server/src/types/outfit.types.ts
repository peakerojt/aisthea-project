import { NormalizedWeather } from './weather.types';

export interface OutfitProfileInput {
  gender?: string;
  style?: string;
  tolerance?: 'low' | 'medium' | 'high';
  occasion?: string;
}

export interface OutfitRecommendInput {
  weather: NormalizedWeather;
  seasonContext: string;
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
