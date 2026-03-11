import React from 'react';
import { Star } from 'lucide-react';
import { OrderDetail, OrderItem } from '@/common/services/orderApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

interface OrderItemsTableProps {
  order: OrderDetail;
  onReview?: (item: OrderItem) => void;
  onProductClick?: (productId: number) => void;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({ order, onReview, onProductClick }) => {
  const isDelivered = (order.status ?? '').toLowerCase() === 'delivered';

  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/40">Sản phẩm</div>
        <div className="text-[10px] uppercase tracking-widest text-white/40">{order.items.length} món</div>
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
                <div className="text-xs text-white/40 font-mono mt-1">SKU: {it.sku}</div>
              </div>

              {/* Price + Review action */}
              <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-white/60">
                    {it.quantity} × {formatCurrency(it.price)}
                  </div>
                  <div className="text-white font-semibold mt-1">{formatCurrency(it.subtotal)}</div>
                </div>

                {/* Review button — only visible on Delivered orders */}
                {isDelivered && (
                  <div>
                    {it.isReviewed ? (
                      /* Already reviewed badge */
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Star size={10} fill="#FBBF24" stroke="#FBBF24" />
                        Đã đánh giá
                      </span>
                    ) : (
                      /* Write review button */
                      <button
                        onClick={() => onReview?.(it)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 text-[11px] font-semibold uppercase tracking-wider transition-all"
                      >
                        <Star size={11} className="group-hover:fill-amber-400 group-hover:stroke-amber-400 transition-colors" />
                        Đánh giá
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
