import React from 'react';
import { useTranslation } from 'react-i18next';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';
import { toCompactStatusKey } from '@/common/utils/orderUiStatus';

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; ring: string; dot: string }
> = {
  RETURN_REQUESTED: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-600/20',
    dot: 'bg-orange-500',
  },
  REQUESTED: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-400',
  },
  SUBMITTED: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-400',
  },
  PENDING_PAYMENT_CONFIRMATION: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-400',
  },
  PENDING_ADMIN_REVIEW: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-400',
  },
  APPROVED: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-600/20',
    dot: 'bg-blue-500',
  },
  IN_RETURN_TRANSIT: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-600/20',
    dot: 'bg-blue-500',
  },
  REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    dot: 'bg-red-500',
  },
  RECEIVED: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-600/20',
    dot: 'bg-teal-500',
  },
  RECEIVED_AND_INSPECTING: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-600/20',
    dot: 'bg-teal-500',
  },
  ACCEPTED_FOR_REFUND: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-600/20',
    dot: 'bg-teal-500',
  },
  REFUNDED: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
    dot: 'bg-green-500',
  },
  CLOSED: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
    dot: 'bg-green-500',
  },
  CANCELLED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const workflowStatus = canonicalizeWorkflowStatusFallback(status);
  const compactStatus = toCompactStatusKey(status);
  const normalizedStatus = (() => {
    if (STATUS_CONFIG[workflowStatus]) return workflowStatus;
    if (compactStatus && STATUS_CONFIG[compactStatus]) return compactStatus;
    return workflowStatus === 'CANCELED' ? 'CANCELLED' : status;
  })();
  const cfg = STATUS_CONFIG[normalizedStatus] ?? {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    ring: 'ring-gray-600/20',
    dot: 'bg-gray-400',
  };
  const label = STATUS_CONFIG[normalizedStatus]
    ? resolveText(
      `status.${normalizedStatus}`,
      ({
        RETURN_REQUESTED: 'Yêu cầu trả hàng',
        REQUESTED: 'Chờ duyệt',
        SUBMITTED: 'Chờ duyệt',
        PENDING_PAYMENT_CONFIRMATION: 'Chờ xác nhận thanh toán',
        PENDING_ADMIN_REVIEW: 'Chờ duyệt',
        APPROVED: 'Đã duyệt',
        IN_RETURN_TRANSIT: 'Đang hoàn về kho',
        REJECTED: 'Đã từ chối',
        RECEIVED: 'Đã nhận hàng',
        RECEIVED_AND_INSPECTING: 'Đã nhận và đang kiểm tra',
        ACCEPTED_FOR_REFUND: 'Đã chấp nhận hoàn tiền',
        REFUNDED: 'Đã hoàn tiền',
        CLOSED: 'Đã đóng',
        CANCELLED: 'Đã hủy',
      } as Record<string, string>)[normalizedStatus] ?? normalizedStatus,
    )
    : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}
