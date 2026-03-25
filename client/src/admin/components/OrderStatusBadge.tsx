import { getStatusMeta, normalizeStatus } from '@/config/orderStatus.config';
import { useTranslation } from 'react-i18next';

interface OrderStatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const RETURN_REQUESTED_META = {
  label: 'Yêu cầu trả hàng',
  icon: 'RotateCcw',
  badgeClass: 'border-orange-500/30 bg-orange-500/10',
  textClass: 'text-orange-400',
  dotClass: 'bg-orange-400',
  glowClass: 'shadow-orange-500/20',
  actionClass: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/30',
  isTerminal: false,
  requiresNote: true,
} as const;

export const getOrderStatusDisplayMeta = (status: string | null | undefined) => {
  const raw = status?.trim() ?? '';
  if (raw.toUpperCase() === 'RETURN_REQUESTED') {
    return {
      canonical: 'RETURN_REQUESTED',
      meta: RETURN_REQUESTED_META,
    };
  }

  const canonical = normalizeStatus(status) ?? status ?? '';
  return {
    canonical,
    meta: getStatusMeta(canonical),
  };
};

/**
 * Order status badge fully driven by the FSM config.
 * No more magic strings — all colors, labels, and dots come from ORDER_STATUS_META.
 */
export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const { t } = useTranslation(['orders']);
  const { canonical, meta } = getOrderStatusDisplayMeta(status);
  const translationKey = canonical ? `status.${canonical.toUpperCase()}` : '';
  const translatedLabel = translationKey ? t(translationKey) : '';
  const label = translatedLabel && translatedLabel !== translationKey ? translatedLabel : meta.label;

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
      {label}
    </span>
  );
};

/**
 * @deprecated Use getStatusMeta() from orderStatus.config instead.
 * Kept for backward compatibility with existing OrderTimeline usage.
 */
export const translateOrderStatus = (status: string | null | undefined): string => {
  const { meta } = getOrderStatusDisplayMeta(status);
  // Fallback to English/meta if needed for raw translations outside components
  return meta.label;
};

/**
 * @deprecated Use getStatusMeta() from orderStatus.config instead.
 */
export const getStatusTone = (status?: string | null): string =>
  getOrderStatusDisplayMeta(status).meta.badgeClass;
