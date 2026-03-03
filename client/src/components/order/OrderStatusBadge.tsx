import React from 'react';
import { getStatusMeta, normalizeStatus } from '../../config/orderStatus.config';

interface OrderStatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

/**
 * Order status badge fully driven by the FSM config.
 * No more magic strings — all colors, labels, and dots come from ORDER_STATUS_META.
 */
export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const canonical = normalizeStatus(status) ?? status ?? '';
  const meta = getStatusMeta(canonical);

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  const dotSize: Record<string, string> = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold
        ${meta.badgeClass} ${meta.textClass} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`rounded-full shrink-0 ${meta.dotClass} ${dotSize[size]}`} />
      )}
      {meta.label}
    </span>
  );
};

/**
 * @deprecated Use getStatusMeta() from orderStatus.config instead.
 * Kept for backward compatibility with existing OrderTimeline usage.
 */
export const translateOrderStatus = (status: string | null | undefined): string =>
  getStatusMeta(normalizeStatus(status) ?? status ?? '').label;

/**
 * @deprecated Use getStatusMeta() from orderStatus.config instead.
 */
export const getStatusTone = (status?: string | null): string =>
  getStatusMeta(normalizeStatus(status) ?? status ?? '').badgeClass;
