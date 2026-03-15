import React from 'react';
import { OrderDetail } from '@/common/services/order.service';
import { formatCurrencyVND } from '@/common/utils/currency';

export const OrderPricingSummary: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const p = order.pricing;
  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Tổng kết</div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-white/70">
            <span>Tạm tính</span>
            <span>{formatCurrencyVND(p.itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Phí vận chuyển</span>
            <span>{formatCurrencyVND(p.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Giảm giá</span>
            <span>-{formatCurrencyVND(p.discount)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Thuế</span>
            <span>{formatCurrencyVND(p.tax)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 flex justify-between text-white">
            <span className="font-semibold">Tổng cộng</span>
            <span className="font-bold text-lg">{formatCurrencyVND(p.grandTotal)}</span>
          </div>
        </div>
    </div>
  );
};

