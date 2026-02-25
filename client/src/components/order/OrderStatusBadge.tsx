import React from 'react';

const translateStatus = (status: string | null | undefined) => {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'Chờ xác nhận';
  if (s === 'confirmed') return 'Đã xác nhận';
  if (s === 'shipping') return 'Đang giao';
  if (s === 'delivered') return 'Đã giao';
  if (s === 'cancelled' || s === 'canceled') return 'Đã hủy';
  return status || 'Không xác định';
};

const statusTone = (status?: string | null) => {
  const s = (status || '').toLowerCase();
  if (['delivered', 'success', 'paid', 'completed'].includes(s)) return 'border-emerald-500/30 text-emerald-200 bg-emerald-500/10';
  if (['shipping', 'shipped', 'delivering'].includes(s)) return 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10';
  if (['pending', 'processing', 'confirmed'].includes(s)) return 'border-amber-500/30 text-amber-200 bg-amber-500/10';
  if (['cancelled', 'canceled', 'failed', 'error'].includes(s)) return 'border-red-500/30 text-red-200 bg-red-500/10';
  return 'border-white/10 text-white/70 bg-white/5';
};

export const OrderStatusBadge: React.FC<{ status: string | null | undefined }> = ({ status }) => (
  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${statusTone(status)}`}>
    {translateStatus(status)}
  </span>
);

export const translateOrderStatus = translateStatus;
export const getStatusTone = statusTone;

