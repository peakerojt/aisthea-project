import React from 'react';
import { OrderDetail } from '../../services/orderApi';
import { OrderStatusBadge, getStatusTone } from './OrderStatusBadge';

import { useTranslation } from 'react-i18next';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatDateTime = (iso: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

export const OrderHeader: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const { t } = useTranslation(['enums']);

  const translatePaymentStatus = (status: string | null | undefined) => {
    const s = (status || '').toUpperCase();
    if (!s) return 'N/A';
    if (s === 'UNPAID') return t('paymentStatus.PENDING', { defaultValue: 'Chưa thanh toán' });
    return t(`paymentStatus.${s}`, { defaultValue: status });
  };
  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-white">#{order.orderCode}</span>
            <OrderStatusBadge status={order.status} />
            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${getStatusTone(order.paymentStatus)}`}>
              {translatePaymentStatus(order.paymentStatus)}
            </span>
          </div>
          <div className="mt-2 text-xs text-white/40 uppercase tracking-widest">Ngày đặt</div>
          <div className="mt-1 text-sm text-white/70">{formatDateTime(order.createdAt)}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/40 uppercase tracking-widest">Tổng tiền</div>
          <div className="mt-1 text-2xl font-black">{formatCurrency(order.pricing.grandTotal)}</div>
          {order.paymentMethod && (
            <div className="mt-1 text-xs text-white/40">Phương thức: {order.paymentMethod}</div>
          )}
        </div>
      </div>
    </div>
  );
};

