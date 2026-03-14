import { chatApi } from '@/common/api/chat.api';
import type { ChatRequestPayload, ChatResponsePayload } from '@/common/api/chat.api';

export type {
  ChatHistoryMessage,
  ChatIntent,
  ChatPage,
  ChatProductRecommendation,
  ChatRequestPayload,
  ChatResponsePayload,
  ChatRole,
} from '@/common/api/chat.api';

export const sendChatMessage = async (payload: ChatRequestPayload): Promise<ChatResponsePayload> => {
  return chatApi.send(payload);
};
