export interface OutfitProfile {
  gender?: string;
  style?: string;
  tolerance?: 'low' | 'medium' | 'high';
  occasion?: string;
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
