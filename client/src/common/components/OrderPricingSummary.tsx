import React from 'react';
import { OrderDetail } from '@/common/services/order.service';
import { formatCurrencyVND } from '@/common/utils/currency';
import { useTranslation } from 'react-i18next';

export const OrderPricingSummary: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderDetail.pricingSummary' });
  const resolveText = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };
  const titleLabel = resolveText('title', 'Tổng kết');
  const subtotalLabel = resolveText('subtotal', 'Tạm tính');
  const shippingLabel = resolveText('shippingFee', 'Phí vận chuyển');
  const discountLabel = resolveText('discount', 'Giảm giá');
  const taxLabel = resolveText('tax', 'Thuế');
  const totalLabel = resolveText('total', 'Tổng cộng');
  const p = order.pricing;
  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="text-[10px] uppercase tracking-widest text-white/40">{titleLabel}</div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-white/70">
            <span>{subtotalLabel}</span>
            <span>{formatCurrencyVND(p.itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>{shippingLabel}</span>
            <span>{formatCurrencyVND(p.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>{discountLabel}</span>
            <span>-{formatCurrencyVND(p.discount)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>{taxLabel}</span>
            <span>{formatCurrencyVND(p.tax)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 flex justify-between text-white">
            <span className="font-semibold">{totalLabel}</span>
            <span className="font-bold text-lg">{formatCurrencyVND(p.grandTotal)}</span>
          </div>
        </div>
    </div>
  );
};

