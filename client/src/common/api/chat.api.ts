import { api } from '@/common/utils/api';

export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product';
export type ChatIntent = 'STYLE' | 'PRODUCT' | 'GENERAL';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestPayload {
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

export interface ChatResponsePayload {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
  success?: boolean;
  message?: string;
  messageKey?: string;
}

export const chatApi = {
  send: (payload: ChatRequestPayload) => api.post<ChatResponsePayload>('/api/chat', payload),
};
