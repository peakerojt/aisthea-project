import React from 'react';
import { Star } from 'lucide-react';
import { OrderDetail, OrderItem } from '@/common/services/order.service';
import { useTranslation } from 'react-i18next';
import { normalizeStatus, ORDER_STATUS } from '@/config/orderStatus.config';
import { formatCurrencyFullVND } from '@/common/utils/currency';

interface OrderItemsTableProps {
  order: OrderDetail;
  onReview?: (item: OrderItem) => void;
  onProductClick?: (productId: number) => void;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({ order, onReview, onProductClick }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderDetail.items' });
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const titleLabel = resolveText('title', 'Sản phẩm');
  const countLabel = resolveText('count', '{{count}} món', { count: order.items.length });
  const skuLabel = resolveText('sku', 'SKU');
  const reviewedLabel = resolveText('reviewed', 'Đã đánh giá');
  const reviewActionLabel = resolveText('reviewAction', 'Đánh giá');
  const isDelivered = normalizeStatus(order.status?.trim()) === ORDER_STATUS.DELIVERED;

  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40">{titleLabel}</div>
        <div className="text-[10px] uppercase tracking-widest text-white/40">{countLabel}</div>
      </div>

      <div className="mt-4 space-y-3">
        {order.items.map((it) => {
          const canNavigate = !!onProductClick && !!it.productId;
          return (
            <div
              key={`${it.sku}-${it.orderItemId}`}
              className="p-4 bg-black/20 border border-white/10 rounded flex gap-4"
            >
              {/* Thumbnail — clickable if productId available */}
              <button
                onClick={() => canNavigate && onProductClick!(Number(it.productId))}
                disabled={!canNavigate}
                className={`h-16 w-16 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0 transition-opacity ${canNavigate ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
              >
                {it.thumbnailUrl || it.thumbnail ? (
                  <img
                    src={it.thumbnailUrl || it.thumbnail!}
                    alt={it.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/20">
                    <span className="material-symbols-outlined">image</span>
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => canNavigate && onProductClick!(Number(it.productId))}
                  disabled={!canNavigate}
                  className={`text-white font-medium truncate block text-left w-full ${canNavigate ? 'hover:text-amber-400 transition-colors cursor-pointer' : ''}`}
                >
                  {it.productName}
                </button>
                <div className="text-xs text-white/50 mt-1">{it.variantName ?? it.variant}</div>
                <div className="text-xs text-white/40 font-mono mt-1">{skuLabel}: {it.sku}</div>
              </div>

              {/* Price + Review action */}
              <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-white/60">
                    {it.quantity} × {formatCurrencyFullVND(it.price)}
                  </div>
                  <div className="text-white font-semibold mt-1">{formatCurrencyFullVND(it.subtotal)}</div>
                </div>

                {/* Review button — only visible on Delivered orders */}
                {isDelivered && (
                  <div>
                    {it.isReviewed ? (
                      /* Already reviewed badge */
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Star size={10} fill="#FBBF24" stroke="#FBBF24" />
                        {reviewedLabel}
                      </span>
                    ) : (
                      /* Write review button */
                      <button
                        onClick={() => onReview?.(it)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 text-[11px] font-semibold uppercase tracking-wider transition-all"
                      >
                        <Star size={11} className="group-hover:fill-amber-400 group-hover:stroke-amber-400 transition-colors" />
                        {reviewActionLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
