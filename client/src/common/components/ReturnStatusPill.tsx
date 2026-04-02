import React from 'react';
import { useTranslation } from 'react-i18next';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';
import { coerceRefundWorkflowStatus } from '@/common/services/return.refund-status';

type ReturnStatusPillKind = 'workflow' | 'refund';

interface ReturnStatusPillProps {
  status?: string | null;
  kind?: ReturnStatusPillKind;
  className?: string;
}

const WORKFLOW_LABELS: Record<string, string> = {
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
};

const REFUND_LABELS: Record<string, string> = {
  NOT_APPLICABLE: 'Chưa mở hoàn tiền',
  LOCKED_UNTIL_PAYMENT_CONFIRMED: 'Khóa tới khi xác nhận thanh toán',
  PENDING: 'Chờ hoàn tiền',
  PROCESSING: 'Đang hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
  FAILED: 'Hoàn tiền thất bại',
  MANUAL_REVIEW: 'Cần kiểm tra thủ công',
};

const TONE_CLASSES = {
  pending: 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100',
  pendingDot: 'bg-amber-300',
  success: 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100',
  successDot: 'bg-emerald-300',
  danger: 'border-red-300/20 bg-red-300/[0.08] text-red-100',
  dangerDot: 'bg-red-300',
  neutral: 'border-white/10 bg-white/[0.04] text-white/72',
  neutralDot: 'bg-white/45',
} as const;

const joinClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(' ');

const resolveWorkflowTone = (status: string) => {
  if (
    status === 'REQUESTED' ||
    status === 'SUBMITTED' ||
    status === 'PENDING_PAYMENT_CONFIRMATION' ||
    status === 'PENDING_ADMIN_REVIEW'
  ) {
    return {
      pill: TONE_CLASSES.pending,
      dot: TONE_CLASSES.pendingDot,
    };
  }

  if (
    status === 'APPROVED' ||
    status === 'IN_RETURN_TRANSIT' ||
    status === 'RECEIVED' ||
    status === 'RECEIVED_AND_INSPECTING' ||
    status === 'ACCEPTED_FOR_REFUND' ||
    status === 'REFUNDED' ||
    status === 'CLOSED'
  ) {
    return {
      pill: TONE_CLASSES.success,
      dot: TONE_CLASSES.successDot,
    };
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    return {
      pill: TONE_CLASSES.danger,
      dot: TONE_CLASSES.dangerDot,
    };
  }

  return {
    pill: TONE_CLASSES.neutral,
    dot: TONE_CLASSES.neutralDot,
  };
};

const resolveRefundTone = (status: string) => {
  if (
    status === 'LOCKED_UNTIL_PAYMENT_CONFIRMED' ||
    status === 'PENDING' ||
    status === 'PROCESSING'
  ) {
    return {
      pill: TONE_CLASSES.pending,
      dot: TONE_CLASSES.pendingDot,
    };
  }

  if (status === 'PARTIALLY_REFUNDED' || status === 'REFUNDED') {
    return {
      pill: TONE_CLASSES.success,
      dot: TONE_CLASSES.successDot,
    };
  }

  if (status === 'FAILED') {
    return {
      pill: TONE_CLASSES.danger,
      dot: TONE_CLASSES.dangerDot,
    };
  }

  return {
    pill: TONE_CLASSES.neutral,
    dot: TONE_CLASSES.neutralDot,
  };
};

export function ReturnStatusPill({
  status,
  kind = 'workflow',
  className,
}: ReturnStatusPillProps) {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };

  const normalizedStatus = kind === 'refund'
    ? coerceRefundWorkflowStatus(status) ?? String(status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase()
    : canonicalizeWorkflowStatusFallback(status);
  const fallbackLabel = kind === 'refund'
    ? REFUND_LABELS[normalizedStatus] ?? normalizedStatus
    : WORKFLOW_LABELS[normalizedStatus] ?? normalizedStatus;
  const labelKey = kind === 'refund'
    ? `refundStatus.${normalizedStatus}`
    : `status.${normalizedStatus}`;
  const tone = kind === 'refund'
    ? resolveRefundTone(normalizedStatus)
    : resolveWorkflowTone(normalizedStatus);

  return (
    <span
      className={joinClasses(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
        tone.pill,
        className,
      )}
    >
      <span className={joinClasses('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {resolveText(labelKey, fallbackLabel)}
    </span>
  );
}
