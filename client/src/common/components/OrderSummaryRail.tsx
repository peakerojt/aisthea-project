import React from 'react';
import { CartItem } from '@/types';
import { OrderSummaryItems } from '@/common/components/OrderSummaryItems';

interface OrderSummaryRailProps {
    title: string;
    items: CartItem[];
    children: React.ReactNode;
    footerNote?: React.ReactNode;
    className?: string;
    maxHeightClassName?: string;
}

export const OrderSummaryRail: React.FC<OrderSummaryRailProps> = ({
    title,
    items,
    children,
    footerNote,
    className = '',
    maxHeightClassName,
}) => (
    <div className={className}>
        <div className="rounded-sm border border-border-dark bg-surface-dark p-6 shadow-xl lg:p-8">
            <h2 className="mb-6 border-b border-border-dark pb-4 text-lg font-bold uppercase tracking-wide">
                {title}
            </h2>

            <div className="mb-8">
                <OrderSummaryItems items={items} maxHeightClassName={maxHeightClassName} />
            </div>

            {children}
        </div>

        {footerNote}
    </div>
);
