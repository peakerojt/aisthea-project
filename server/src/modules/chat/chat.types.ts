export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product';
export type ChatIntent = 'STYLE' | 'PRODUCT' | 'GENERAL';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  productId?: number;
}

export interface ChatProductRecommendation {
  productId: number;
  name: string;
  basePrice: number;
  primaryImageUrl: string | null;
}

export interface ChatResponseDto {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
}
