import React, { Suspense, useEffect, useState } from 'react';
import { Loader2, MessageCircleMore } from 'lucide-react';

export interface ChatWidgetProps {
  page: 'home' | 'product' | 'stylist' | 'support' | 'weather';
  productId?: number | null;
  productName?: string;
  contextSummary?: string;
  initialOpen?: boolean;
}

const ChatWidgetRuntime = React.lazy(() =>
  import('./ChatWidgetRuntime').then((module) => ({
    default: module.ChatWidgetRuntime,
  })),
);

const ChatRuntimeFallback: React.FC = () => (
  <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#090909]/95 text-white shadow-2xl shadow-black/60 backdrop-blur md:inset-x-auto md:bottom-6 md:right-6 md:w-[420px]">
    <div className="flex min-h-[120px] items-center justify-center gap-3 px-4 py-6 text-sm text-white/70">
      <Loader2 size={18} className="animate-spin" />
      Đang mở trợ lý...
    </div>
  </div>
);

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  page,
  productId,
  productName,
  contextSummary,
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [shouldRenderRuntime, setShouldRenderRuntime] = useState(initialOpen);

  useEffect(() => {
    if (!initialOpen) return;
    setShouldRenderRuntime(true);
    setIsOpen(true);
  }, [initialOpen]);

  const openWidget = () => {
    setShouldRenderRuntime(true);
    setIsOpen(true);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={openWidget}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/85 text-white shadow-2xl shadow-black/50 transition hover:scale-105 hover:border-primary/50 hover:text-primary md:bottom-6 md:right-6"
          aria-label="Mở trợ lý chat"
        >
          <MessageCircleMore size={22} />
        </button>
      )}

      {shouldRenderRuntime ? (
        <Suspense fallback={isOpen ? <ChatRuntimeFallback /> : null}>
          <ChatWidgetRuntime
            page={page}
            productId={productId}
            productName={productName}
            contextSummary={contextSummary}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  );
};
