export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product' | 'stylist' | 'support' | 'weather';
export type ChatIntent = 'STYLE' | 'PRODUCT' | 'GENERAL';
export type ChatTelemetryEventName = 'chat_open' | 'chat_send' | 'chat_cta_click' | 'chat_product_click';
export type ChatTelemetryPlacement = 'launcher' | 'initial_actions' | 'reply_actions' | 'product_card';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
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

export interface ChatTelemetryEventDto {
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

export interface ChatTelemetryOverviewDto {
  opens: number;
  sends: number;
  ctaClicks: number;
  productClicks: number;
  uniqueSessions: number;
  sendRate: number;
  clickRate: number;
}

export interface ChatTelemetryByPageDto {
  page: ChatPage;
  opens: number;
  sends: number;
  ctaClicks: number;
  productClicks: number;
}

export interface ChatTelemetryTargetDto {
  target: string;
  label: string | null;
  clicks: number;
}

export interface ChatTelemetryDailyTrendDto {
  label: string;
  opens: number;
  sends: number;
  clicks: number;
}

export interface ChatTelemetrySummaryDto {
  period: {
    start: string;
    end: string;
  };
  overview: ChatTelemetryOverviewDto;
  byPage: ChatTelemetryByPageDto[];
  topTargets: ChatTelemetryTargetDto[];
  dailyTrend: ChatTelemetryDailyTrendDto[];
}

export interface ChatResponseDto {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
  actions: ChatAction[];
}
