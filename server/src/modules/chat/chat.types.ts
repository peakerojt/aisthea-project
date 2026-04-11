export type ChatRole = 'user' | 'assistant';
export type ChatPage = 'home' | 'product' | 'stylist' | 'support' | 'weather';
export type ChatIntent = 'PRODUCT' | 'STYLE' | 'SUPPORT' | 'OUT_OF_SCOPE';
export type ChatTelemetryEventName = 'chat_open' | 'chat_send' | 'chat_cta_click' | 'chat_product_click';
export type ChatTelemetryPlacement = 'launcher' | 'initial_actions' | 'reply_actions' | 'product_card';
export type ChatTelemetryInternalEventDto =
  | 'chat_out_of_scope_blocked'
  | 'chat_support_redirected'
  | 'chat_short_answer_returned'
  | 'chat_clarification_asked';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequestDto {
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

export interface ChatTelemetryInternalMetricDto {
  event: ChatTelemetryInternalEventDto;
  total: number;
  rate: number;
}

export interface ChatTelemetryInternalByPageDto {
  page: ChatPage;
  outOfScopeBlocked: number;
  supportRedirected: number;
  clarificationAsked: number;
  shortAnswerReturned: number;
}

export interface ChatTelemetryInternalTrendDto {
  label: string;
  outOfScopeBlocked: number;
  supportRedirected: number;
  clarificationAsked: number;
  shortAnswerReturned: number;
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
  internalSignals: ChatTelemetryInternalMetricDto[];
  internalSignalsByPage: ChatTelemetryInternalByPageDto[];
  internalSignalsTrend: ChatTelemetryInternalTrendDto[];
}

export interface ChatResponseDto {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
  actions: ChatAction[];
}
