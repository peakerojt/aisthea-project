import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, SendHorizonal, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  sendChatMessage,
  type ChatAction,
  type ChatPage,
  type ChatProductRecommendation,
  type ChatRole,
  trackChatEvent,
} from '@/common/services/chat.service';
import type { ChatWidgetProps } from '@/common/components/ChatWidget';

type UiChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  products?: ChatProductRecommendation[];
  actions?: ChatAction[];
  pending?: boolean;
};

interface ChatWidgetRuntimeProps extends Omit<ChatWidgetProps, 'initialOpen'> {
  isOpen: boolean;
  onClose: () => void;
}

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createSessionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const buildInitialActions = (page: ChatPage): ChatAction[] => {
  if (page === 'product') {
    return [
      { type: 'navigate', label: 'Phối với gì', to: '/stylist' },
      { type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' },
      { type: 'navigate', label: 'Xem hỗ trợ', to: '/support' },
    ];
  }

  if (page === 'stylist') {
    return [
      { type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' },
      { type: 'navigate', label: 'Xem hỗ trợ', to: '/support' },
    ];
  }

  if (page === 'weather') {
    return [
      { type: 'navigate', label: 'Mở stylist', to: '/stylist' },
      { type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' },
      { type: 'navigate', label: 'Xem hỗ trợ', to: '/support' },
    ];
  }

  if (page === 'support') {
    return [
      { type: 'navigate', label: 'Xem đổi trả', to: '/support?section=returns' },
      { type: 'navigate', label: 'Xem FAQ', to: '/support?section=faq' },
      { type: 'navigate', label: 'Xem sản phẩm', to: '/collection' },
    ];
  }

  return [
    { type: 'navigate', label: 'Mở stylist', to: '/stylist' },
    { type: 'navigate', label: 'Xem bộ sưu tập', to: '/collection' },
    { type: 'navigate', label: 'Xem hỗ trợ', to: '/support' },
  ];
};

const buildInitialMessage = (page: ChatPage, productName?: string): UiChatMessage => ({
  id: 'initial-assistant-message',
  role: 'assistant',
  content: (() => {
    if (page === 'product') {
      return `Mình trả lời ngắn về size, fit, chất liệu và cách phối cho ${productName || 'sản phẩm này'}.`;
    }

    if (page === 'stylist') {
      return 'Mình gợi ý phối đồ ngắn gọn, bám sản phẩm AISTHEA và nhu cầu mặc của bạn.';
    }

    if (page === 'weather') {
      return 'Mình gợi ý cách mặc theo thời tiết nếu vẫn gắn với sản phẩm AISTHEA.';
    }

    if (page === 'support') {
      return 'Mình sẽ chỉ đúng mục hỗ trợ cần thiết hoặc kéo bạn về câu hỏi sản phẩm phù hợp.';
    }

    return 'Mình hỗ trợ hỏi về mẫu, size, fit, phối đồ và mua hàng của AISTHEA.';
  })(),
  actions: buildInitialActions(page),
});

const dedupeActions = (actions: ChatAction[] | undefined): ChatAction[] => {
  if (!actions || actions.length === 0) return [];

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.type}:${action.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const ChatWidgetRuntime: React.FC<ChatWidgetRuntimeProps> = ({
  page,
  productId,
  productName,
  contextSummary,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<UiChatMessage[]>(() => [buildInitialMessage(page, productName)]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef(createSessionId());
  const hasTrackedOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    setMessages([buildInitialMessage(page, productName)]);
    setInput('');
    setIsSending(false);
    sessionIdRef.current = createSessionId();
    hasTrackedOpenRef.current = false;
  }, [page, productId, productName]);

  useEffect(() => {
    if (!isOpen || hasTrackedOpenRef.current) return;

    hasTrackedOpenRef.current = true;
    void trackChatEvent({
      event: 'chat_open',
      page,
      sessionId: sessionIdRef.current,
      productId: page === 'product' ? productId ?? undefined : undefined,
      conversationLength: messages.length,
      placement: 'launcher',
      hasContextSummary: Boolean(contextSummary),
    });
  }, [contextSummary, isOpen, messages.length, page, productId]);

  const title = useMemo(() => {
    if (page === 'product') return 'Trợ lý sản phẩm';
    if (page === 'stylist') return 'Trợ lý phối đồ';
    if (page === 'weather') return 'Trợ lý thời tiết';
    if (page === 'support') return 'Trợ lý hỗ trợ';
    return 'Trợ lý AISTHEA';
  }, [page]);

  const placeholder = (() => {
    if (page === 'product') return 'Ví dụ: Mẫu này form rộng không?';
    if (page === 'stylist') return 'Ví dụ: Chân váy này phối với áo nào?';
    if (page === 'weather') return 'Ví dụ: Trời nóng nên chọn mẫu nào của shop?';
    if (page === 'support') return 'Ví dụ: Có đổi size được không?';
    return 'Ví dụ: Tìm váy đi làm màu tối';
  })();

  const hasConversationStarted = useMemo(
    () => messages.some((message) => message.role === 'user'),
    [messages],
  );

  const handleNavigateAction = (action: ChatAction, messageId: string) => {
    void trackChatEvent({
      event: 'chat_cta_click',
      page,
      sessionId: sessionIdRef.current,
      productId: page === 'product' ? productId ?? undefined : undefined,
      conversationLength: messages.length,
      target: action.to,
      label: action.label,
      placement: messageId === 'initial-assistant-message' ? 'initial_actions' : 'reply_actions',
      hasContextSummary: Boolean(contextSummary),
    });
    navigate(action.to);
    onClose();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    if (page === 'product' && !productId) return;

    const userMessage: UiChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };
    const pendingId = createMessageId();
    const history = messages
      .filter((message) => !message.pending)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: pendingId,
        role: 'assistant',
        content: 'Đang trả lời...',
        pending: true,
      },
    ]);
    setInput('');
    setIsSending(true);
    void trackChatEvent({
      event: 'chat_send',
      page,
      sessionId: sessionIdRef.current,
      productId: page === 'product' ? productId ?? undefined : undefined,
      messageLength: trimmed.length,
      conversationLength: history.length + 1,
      hasContextSummary: Boolean(contextSummary),
    });

    try {
      const response = await sendChatMessage({
        message: trimmed,
        page,
        history,
        sessionId: sessionIdRef.current,
        productId: page === 'product' ? productId ?? undefined : undefined,
        contextSummary,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                content: response.reply,
                products: response.products,
                actions: response.actions,
              }
            : message,
        ),
      );
    } catch (error) {
      console.error('Chat request failed:', error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                content: 'Hiện tại mình chưa trả lời được. Bạn thử gửi lại sau nhé.',
              }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#090909]/95 text-white shadow-2xl shadow-black/60 backdrop-blur md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-primary">
            <Sparkles size={14} />
            Trợ lý AISTHEA
          </div>
          <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng trợ lý chat"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-white/10 bg-white/[0.05] text-white/90'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {message.pending && (
                <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                  <Loader2 size={14} className="animate-spin" />
                  Đang lấy câu trả lời...
                </div>
              )}

              {(() => {
                const shouldHideInitialActions =
                  message.id === 'initial-assistant-message' && hasConversationStarted;
                const renderableActions = shouldHideInitialActions ? [] : dedupeActions(message.actions);

                if (renderableActions.length === 0) return null;

                return (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {renderableActions.map((action) => (
                      <button
                        key={`${message.id}-${action.to}`}
                        type="button"
                        onClick={() => handleNavigateAction(action, message.id)}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary/20 hover:text-white"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 bg-black/40 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder={placeholder}
            className="min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-primary/50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending || !input.trim() || (page === 'product' && !productId)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
