import { api } from '@/common/utils/api';

export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product' | 'stylist' | 'support' | 'weather';
export type ChatIntent = 'STYLE' | 'PRODUCT' | 'GENERAL';
export type ChatTelemetryEventName = 'chat_open' | 'chat_send' | 'chat_cta_click' | 'chat_product_click';
export type ChatTelemetryPlacement = 'launcher' | 'initial_actions' | 'reply_actions' | 'product_card';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  productId?: number;
  contextSummary?: string;
}

export interface ChatProductRecommendation {
  productId: number;
  name: string;
  basePrice: number;
  primaryImageUrl: string | null;
}

export interface ChatAction {
  type: 'navigate';
  label: string;
  to: string;
}

export interface ChatTelemetryPayload {
  event: ChatTelemetryEventName;
  page: ChatPage;
  sessionId: string;
  productId?: number;
  messageLength?: number;
  conversationLength?: number;
  target?: string;
  label?: string;
  placement?: ChatTelemetryPlacement;
  hasContextSummary?: boolean;
}

export interface ChatTelemetryOverview {
  opens: number;
  sends: number;
  ctaClicks: number;
  productClicks: number;
  uniqueSessions: number;
  sendRate: number;
  clickRate: number;
}

export interface ChatTelemetryByPage {
  page: ChatPage;
  opens: number;
  sends: number;
  ctaClicks: number;
  productClicks: number;
}

export interface ChatTelemetryTarget {
  target: string;
  label: string | null;
  clicks: number;
}

export interface ChatTelemetryDailyTrend {
  label: string;
  opens: number;
  sends: number;
  clicks: number;
}

export interface ChatTelemetrySummaryPayload {
  period: {
    start: string;
    end: string;
  };
  overview: ChatTelemetryOverview;
  byPage: ChatTelemetryByPage[];
  topTargets: ChatTelemetryTarget[];
  dailyTrend: ChatTelemetryDailyTrend[];
  success?: boolean;
  message?: string;
  messageKey?: string;
}

export interface ChatResponsePayload {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
  actions: ChatAction[];
  success?: boolean;
  message?: string;
  messageKey?: string;
}

export const chatApi = {
  send: (payload: ChatRequestPayload) => api.post<ChatResponsePayload>('/api/chat', payload),
  fetchTelemetrySummary: (qs: string) => api.get<ChatTelemetrySummaryPayload>(`/api/chat/analytics/summary${qs ? `?${qs}` : ''}`),
};
