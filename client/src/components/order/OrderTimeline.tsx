import React from 'react';
import { OrderDetail } from '../../services/orderApi';
import { translateOrderStatus } from './OrderStatusBadge';

const formatDateTime = (iso: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

export const OrderTimeline: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
    <div className="text-[10px] uppercase tracking-widest text-white/40">Lịch sử trạng thái</div>
    {order.timeline.length === 0 ? (
      <div className="mt-4 text-sm text-white/50">Chưa có lịch sử trạng thái.</div>
    ) : (
      <ol className="mt-4 space-y-3 text-sm">
        {order.timeline.map((t) => (
          <li key={`${t.status}-${t.at}`} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-white" />
            <div>
              <div className="text-white font-medium">{translateOrderStatus(t.status)}</div>
              <div className="text-xs text-white/50 mt-1">{formatDateTime(t.at)}</div>
            </div>
          </li>
        ))}
      </ol>
    )}
  </div>
);

