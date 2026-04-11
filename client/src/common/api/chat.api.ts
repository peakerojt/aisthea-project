import { api } from '@/common/utils/api';

export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product' | 'stylist' | 'support' | 'weather';
export type ChatIntent = 'PRODUCT' | 'STYLE' | 'SUPPORT' | 'OUT_OF_SCOPE';
export type ChatTelemetryEventName = 'chat_open' | 'chat_send' | 'chat_cta_click' | 'chat_product_click';
export type ChatTelemetryPlacement = 'launcher' | 'initial_actions' | 'reply_actions' | 'product_card';
export type ChatTelemetryInternalEvent =
  | 'chat_out_of_scope_blocked'
  | 'chat_support_redirected'
  | 'chat_short_answer_returned'
  | 'chat_clarification_asked';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  sessionId?: string;
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

export interface ChatTelemetryInternalMetric {
  event: ChatTelemetryInternalEvent;
  total: number;
  rate: number;
}

export interface ChatTelemetryInternalByPage {
  page: ChatPage;
  outOfScopeBlocked: number;
  supportRedirected: number;
  clarificationAsked: number;
  shortAnswerReturned: number;
}

export interface ChatTelemetryInternalTrend {
  label: string;
  outOfScopeBlocked: number;
  supportRedirected: number;
  clarificationAsked: number;
  shortAnswerReturned: number;
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
  internalSignals: ChatTelemetryInternalMetric[];
  internalSignalsByPage: ChatTelemetryInternalByPage[];
  internalSignalsTrend: ChatTelemetryInternalTrend[];
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
