import React from 'react';
import { OrderDetail } from '../../services/orderApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const OrderItemsTable: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Sản phẩm</div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{order.items.length} món</div>
    </div>

    <div className="mt-4 space-y-3">
      {order.items.map((it) => (
        <div key={`${it.sku}-${it.variant}`} className="p-4 bg-black/20 border border-white/10 rounded flex gap-4">
          <div className="h-16 w-16 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0">
            {it.thumbnail ? (
              <img src={it.thumbnail} alt={it.productName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/20">
                <span className="material-symbols-outlined">image</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{it.productName}</div>
            <div className="text-xs text-white/50 mt-1">{it.variant}</div>
            <div className="text-xs text-white/40 font-mono mt-1">SKU: {it.sku}</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/60">
              {it.quantity} × {formatCurrency(it.price)}
            </div>
            <div className="text-white font-semibold mt-1">{formatCurrency(it.subtotal)}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

