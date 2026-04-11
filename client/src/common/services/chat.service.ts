import { chatApi } from '@/common/api/chat.api';
import { API_BASE_URL } from '@/common/utils/api';
import i18n from '@/i18n/config';
import type {
  ChatRequestPayload,
  ChatResponsePayload,
  ChatTelemetryPayload,
  ChatTelemetrySummaryPayload,
} from '@/common/api/chat.api';

export type {
  ChatHistoryMessage,
  ChatIntent,
  ChatPage,
  ChatProductRecommendation,
  ChatRequestPayload,
  ChatResponsePayload,
  ChatRole,
  ChatAction,
  ChatTelemetryEventName,
  ChatTelemetryPlacement,
  ChatTelemetryPayload,
  ChatTelemetrySummaryPayload,
  ChatTelemetryOverview,
  ChatTelemetryByPage,
  ChatTelemetryTarget,
  ChatTelemetryDailyTrend,
  ChatTelemetryInternalEvent,
  ChatTelemetryInternalByPage,
  ChatTelemetryInternalMetric,
  ChatTelemetryInternalTrend,
} from '@/common/api/chat.api';

export const sendChatMessage = async (payload: ChatRequestPayload): Promise<ChatResponsePayload> => {
  return chatApi.send(payload);
};

export const fetchChatTelemetrySummary = async (
  startDate?: string,
  endDate?: string,
): Promise<ChatTelemetrySummaryPayload> => {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return chatApi.fetchTelemetrySummary(params.toString());
};

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const DEFAULT_LANGUAGE = 'vi';

const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const source = `; ${document.cookie}`;
  const parts = source.split(`; ${name}=`);
  if (parts.length !== 2) return undefined;
  return decodeURIComponent(parts.pop()!.split(';').shift() || '');
};

const getActiveLanguage = () => {
  const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
  return current.split('-')[0] || DEFAULT_LANGUAGE;
};

export const trackChatEvent = async (payload: ChatTelemetryPayload): Promise<void> => {
  try {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    await fetch(`${API_BASE_URL}/api/chat/events`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'x-lang': getActiveLanguage(),
        'accept-language': getActiveLanguage(),
        ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Chat telemetry failed:', error);
  }
};
