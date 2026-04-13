import React from 'react';
import { AdminBadge } from '@/admin/components/AdminUI';
import {
  formatAdminReturnMoneyVND,
  getAdminRefundStatusBadgeTone,
  getAdminRefundStatusLabel,
  getAdminReturnStatusBadgeTone,
  getAdminReturnStatusLabel,
} from '@/admin/utils/returns.utils';
import type { OrderReturn, ReturnEconomicsSummary } from '@/common/services/return.types';
import { refundUi } from '@/common/styles/refundUi';

interface ReturnReviewSummarySectionProps {
  activeItem: OrderReturn;
  activeRefundStatus: string;
  customerLabel: string;
  discountTotalLabel: string;
  expectedRefundAmount: number;
  expectedRefundHintLabel: string;
  expectedRefundLabel: string;
  grossTotalLabel: string;
  itemEconomicsSummary: ReturnEconomicsSummary;
  legacyTotalRefundAmount: string | number | null | undefined;
  netPaidTotalLabel: string;
  orderValueLabel: string;
  requestDateLabel: string;
  refundStatusLabel: string;
  resolveText: (key: string, fallback: string, options?: Record<string, unknown>) => string;
  showsRefundCapAdjustment: boolean;
  statusLabel: string;
  statusTranslator: (key: string, options?: Record<string, unknown>) => string;
}

const getDateTimeParts = (iso?: string | null) => {
  if (!iso) {
    return { time: '—', date: '—' };
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { time: String(iso), date: '—' };
  }

  return {
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(parsed),
    date: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed),
  };
};

export const ReturnReviewSummarySection: React.FC<ReturnReviewSummarySectionProps> = ({
  activeItem,
  activeRefundStatus,
  customerLabel,
  discountTotalLabel,
  expectedRefundAmount,
  expectedRefundHintLabel,
  expectedRefundLabel,
  grossTotalLabel,
  itemEconomicsSummary,
  legacyTotalRefundAmount,
  netPaidTotalLabel,
  orderValueLabel,
  requestDateLabel,
  refundStatusLabel,
  resolveText,
  showsRefundCapAdjustment,
  statusLabel,
  statusTranslator,
}) => {
  const requestDateParts = getDateTimeParts(activeItem.createdAt);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className={`${refundUi.sectionMuted} flex min-h-[132px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {statusLabel}
        </div>
        <AdminBadge
          tone={getAdminReturnStatusBadgeTone(activeItem.workflowStatus ?? activeItem.status)}
          className="w-fit self-start rounded-lg px-2 py-1 text-[10px] font-semibold"
        >
          {getAdminReturnStatusLabel(activeItem.workflowStatus ?? activeItem.status, statusTranslator)}
        </AdminBadge>
      </div>

      <div className={`${refundUi.sectionMuted} flex min-h-[132px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {requestDateLabel}
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-semibold tracking-tight text-white">
            {requestDateParts.time}
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
            {requestDateParts.date}
          </div>
        </div>
      </div>

      <div className={`${refundUi.sectionMuted} flex min-h-[132px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {customerLabel}
        </div>
        <div className="text-sm font-medium text-white">
          {activeItem.user?.fullName ?? '—'}
        </div>
        <div className="mt-0.5 text-xs text-white/40">
          {activeItem.user?.email ?? '—'}
        </div>
      </div>

      <div className={`${refundUi.sectionMuted} flex min-h-[132px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {orderValueLabel}
        </div>
        <div className="text-sm font-semibold text-white">
          {activeItem.order?.totalAmount
            ? formatAdminReturnMoneyVND(activeItem.order.totalAmount)
            : '—'}
        </div>
      </div>

      <div className={`${refundUi.success} flex min-h-[148px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {expectedRefundLabel}
        </div>
        <div className="text-sm font-semibold text-emerald-300">
          {expectedRefundAmount > 0 ? formatAdminReturnMoneyVND(expectedRefundAmount) : '—'}
        </div>
        {itemEconomicsSummary.hasSnapshotBreakdown && (
          <div className="mt-2 space-y-1 text-[11px] text-white/60">
            <div>
              {netPaidTotalLabel}:{' '}
              <span className="font-medium text-white/80">
                {formatAdminReturnMoneyVND(itemEconomicsSummary.totalNetPaidAmount)}
              </span>
            </div>
            <div>
              {grossTotalLabel}:{' '}
              <span className="font-medium text-white/80">
                {formatAdminReturnMoneyVND(itemEconomicsSummary.totalGrossAmount)}
              </span>
            </div>
            <div>
              {discountTotalLabel}:{' '}
              <span className="font-medium text-white/80">
                {formatAdminReturnMoneyVND(itemEconomicsSummary.totalDiscountAmount)}
              </span>
            </div>
          </div>
        )}
        {showsRefundCapAdjustment && (
          <>
            <div className="mt-1 text-[11px] text-white/50">
              {resolveText(
                'detail.infoExpectedRefundLegacy',
                'Theo tổng cũ: {{amount}}',
                {
                  amount: formatAdminReturnMoneyVND(legacyTotalRefundAmount),
                },
              )}
            </div>
            <div className="mt-1 text-[11px] text-white/50">
              {expectedRefundHintLabel}
            </div>
          </>
        )}
      </div>

      <div className={`${refundUi.sectionMuted} flex min-h-[148px] flex-col justify-between p-5`}>
        <div className={`${refundUi.eyeBrow} mb-1`}>
          {refundStatusLabel}
        </div>
        <AdminBadge
          tone={getAdminRefundStatusBadgeTone(activeRefundStatus)}
          className="w-fit self-start rounded-lg px-2 py-1 text-[10px] font-semibold"
        >
          {getAdminRefundStatusLabel(activeRefundStatus, statusTranslator)}
        </AdminBadge>
      </div>
    </div>
  );
};
