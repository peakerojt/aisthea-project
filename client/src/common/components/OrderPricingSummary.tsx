import React from 'react';
import { OrderDetail } from '@/common/services/orderApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const OrderPricingSummary: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const p = order.pricing;
  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Tổng kết</div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Tạm tính</span>
          <span>{formatCurrency(p.itemsTotal)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Phí vận chuyển</span>
          <span>{formatCurrency(p.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Giảm giá</span>
          <span>-{formatCurrency(p.discount)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Thuế</span>
          <span>{formatCurrency(p.tax)}</span>
        </div>
        <div className="border-t border-white/10 pt-3 mt-3 flex justify-between text-white">
          <span className="font-semibold">Tổng cộng</span>
          <span className="font-bold text-lg">{formatCurrency(p.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
};

