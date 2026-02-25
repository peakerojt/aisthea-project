import React from 'react';
import { OrderDetail } from '../../services/orderApi';

export const ShippingAddressCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const a = order.shippingAddress;
  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">Giao hàng</div>
          <div className="mt-2 text-sm text-white">
            <div className="font-semibold">{a.recipientName}</div>
            <div className="text-white/70 mt-1">{a.recipientPhone}</div>
            <div className="text-white/70 mt-2">{a.addressLine}</div>
            <div className="text-white/70 mt-1">
              {a.ward ? `${a.ward}, ` : ''}
              {a.district ? `${a.district}, ` : ''}
              {a.city}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

