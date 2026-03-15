import React from 'react';
import { CartItem } from '@/types';
import { formatCurrencyVND } from '@/common/utils/currency';

interface OrderSummaryItemsProps {
    items: CartItem[];
    className?: string;
    maxHeightClassName?: string;
}

export const OrderSummaryItems: React.FC<OrderSummaryItemsProps> = ({
    items,
    className = '',
    maxHeightClassName = 'max-h-[260px]',
}) => (
    <div className={`overflow-y-auto pr-2 custom-scrollbar ${maxHeightClassName} ${className}`.trim()}>
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-4">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-800">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface-dark bg-gray-600 text-[10px] font-bold text-white">
                            {item.quantity}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-gray-200">{item.name}</h3>
                        <p className="mt-1 text-xs text-gray-500">{item.size} / {item.color}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium">{formatCurrencyVND(item.price * item.quantity)}</p>
                </div>
            ))}
        </div>
    </div>
);
