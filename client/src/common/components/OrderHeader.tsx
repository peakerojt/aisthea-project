import React from 'react';
import { OrderDetail } from '@/common/services/order.service';
import { OrderStatusBadge } from '@/admin/components/OrderStatusBadge';
import { PaymentMethodLabel, PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';
import { formatVietnamTime } from '@/common/utils/formatDate';
import { useTranslation } from 'react-i18next';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatDateTime = (iso: string | null) => {
  return formatVietnamTime(iso);
};

export const OrderHeader: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderDetail.header' });
  const resolveText = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };
  const orderDateLabel = resolveText('orderDate', 'Ngày đặt');
  const totalLabel = resolveText('total', 'Tổng tiền');
  const paymentMethodLabel = resolveText('paymentMethod', 'Phương thức');

  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-white">#{order.orderCode}</span>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus} size="xs" uppercase className="tracking-widest" />
          </div>
          <div className="mt-2 text-xs text-white/40 uppercase tracking-widest">{orderDateLabel}</div>
          <div className="mt-1 text-sm text-white/70">{formatDateTime(order.createdAt)}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/40 uppercase tracking-widest">{totalLabel}</div>
          <div className="mt-1 text-2xl font-black">{formatCurrency(order.pricing.grandTotal)}</div>
          {order.paymentMethod && (
            <div className="mt-1 text-xs text-white/40">
              {paymentMethodLabel}: <PaymentMethodLabel paymentMethod={order.paymentMethod} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

