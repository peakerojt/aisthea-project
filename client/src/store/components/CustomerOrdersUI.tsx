import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';
import { type MyReturnSummary } from '@/common/services/return.summary.service';
import { refundUi } from '@/common/styles/refundUi';
import { formatCurrencyVND } from '@/common/utils/currency';
import { formatVietnamTime } from '@/common/utils/formatDate';
import { getPaymentStatusMeta } from '@/common/utils/paymentStatus';
import { resolveExpectedRefundEconomics } from '@/common/utils/returnEconomics';
import { getCustomerOrderStatusMeta, normalizeCustomerOrderStatus } from '@/store/utils/orderStatusDisplay';

export type CustomerOrderStatusFilter = '' | 'Pending' | 'returns' | 'Shipping' | 'Delivered' | 'Cancelled';

export type CustomerOrderListItem = {
  orderId: number;
  orderNumber: string;
  orderCode?: string | null;
  totalAmount: string | number;
  itemCount?: number | null;
  status: string | null | undefined;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
  activeReturn?: MyReturnSummary | null;
};

const refundStatusFallbacks: Record<string, string> = {
  LOCKED_UNTIL_PAYMENT_CONFIRMED: 'Khóa tới khi xác nhận thanh toán',
  PENDING: 'Chờ hoàn tiền',
  PROCESSING: 'Đang hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
  FAILED: 'Hoàn tiền thất bại',
  MANUAL_REVIEW: 'Cần kiểm tra thủ công',
};

const returnWorkflowFallbacks: Record<string, string> = {
  REQUESTED: 'Chờ duyệt',
  SUBMITTED: 'Đã gửi yêu cầu',
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
};

const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));

const normalizeReturnUiStatus = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getReturnCardBadgeClassName = (normalizedStatus: string) => {
  if (['REJECTED', 'FAILED'].includes(normalizedStatus)) {
    return 'border-red-400/25 bg-red-400/10 text-red-100';
  }

  if (['REFUNDED', 'CLOSED'].includes(normalizedStatus)) {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  }

  if (['APPROVED', 'IN_RETURN_TRANSIT', 'RECEIVED', 'RECEIVED_AND_INSPECTING', 'ACCEPTED_FOR_REFUND', 'PROCESSING', 'PARTIALLY_REFUNDED'].includes(normalizedStatus)) {
    return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  }

  return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
};

const useCustomerOrdersTranslators = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'myOrders' });
  const { t: tReturns } = useTranslation('returns');

  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as never, { ...(options ?? {}), defaultValue: fallback } as never);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };

  const resolveReturnText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = tReturns(key as never, { ...(options ?? {}), defaultValue: fallback } as never);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };

  return { resolveText, resolveReturnText };
};

export const useCustomerOrdersText = () => {
  const { resolveText, resolveReturnText } = useCustomerOrdersTranslators();

  return useMemo(
    () => ({
      tabAllLabel: resolveText('tabs.all', 'Tất cả'),
      tabPendingLabel: resolveText('tabs.pending', 'Chờ xác nhận'),
      tabReturnsLabel: resolveText('tabs.returns', 'Hoàn hàng'),
      tabShippingLabel: resolveText('tabs.shipping', 'Đang giao hàng'),
      tabDeliveredLabel: resolveText('tabs.delivered', 'Đã giao hàng'),
      tabCancelledLabel: resolveText('tabs.cancelled', 'Đã hủy'),
      refreshLabel: resolveText('actions.refresh', 'Làm mới'),
      viewLabel: resolveText('actions.view', 'Xem'),
      viewReturnLabel: resolveText('actions.viewReturn', 'Xem hoàn trả'),
      showReturnInfoLabel: resolveText('actions.showReturnInfo', 'Xem thông tin hoàn hàng'),
      hideReturnInfoLabel: resolveText('actions.hideReturnInfo', 'Ẩn thông tin hoàn hàng'),
      unknownLabel: resolveText('states.unknown', 'Không xác định'),
      totalLabel: resolveText('labels.total', 'Tổng tiền'),
      itemsLabel: resolveText('labels.items', 'Số món'),
      orderCodeLabel: resolveText('labels.orderCode', 'Mã đơn hàng'),
      returnStatusCardLabel: resolveText('labels.returnStatus', 'Trạng thái hoàn hàng'),
      refundStatusLabel: resolveReturnText('detail.infoRefundStatus', 'Trạng thái hoàn tiền'),
      refundUpdateLabel: resolveReturnText('detail.infoFinanceUpdate', 'Cập nhật hoàn tiền'),
      expectedRefundLabel: resolveReturnText('detail.infoExpectedRefund', 'Hoàn tiền dự kiến'),
      refundLockedLabel: resolveReturnText(
        'detail.refundLocked',
        'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.',
      ),
      refundLockedHintLabel: resolveReturnText(
        'detail.refundLockedHint',
        'Mở đơn hàng và xác nhận đã nhận hàng để tiếp tục xử lý hoàn trả.',
      ),
      refundLockedActionLabel: resolveReturnText(
        'detail.goToOrderForPaymentConfirmation',
        'Mở đơn hàng để xác nhận đã nhận hàng',
      ),
      resolveReturnText,
    }),
    [resolveReturnText, resolveText],
  );
};

export const useCustomerOrderStatusTabs = () => {
  const text = useCustomerOrdersText();

  return useMemo(
    () => [
      { label: text.tabAllLabel, value: '' as CustomerOrderStatusFilter },
      { label: text.tabPendingLabel, value: 'Pending' as CustomerOrderStatusFilter },
      { label: text.tabReturnsLabel, value: 'returns' as CustomerOrderStatusFilter },
      { label: text.tabShippingLabel, value: 'Shipping' as CustomerOrderStatusFilter },
      { label: text.tabDeliveredLabel, value: 'Delivered' as CustomerOrderStatusFilter },
      { label: text.tabCancelledLabel, value: 'Cancelled' as CustomerOrderStatusFilter },
    ],
    [text.tabAllLabel, text.tabCancelledLabel, text.tabDeliveredLabel, text.tabPendingLabel, text.tabReturnsLabel, text.tabShippingLabel],
  );
};

export const filterCustomerOrders = <T extends CustomerOrderListItem>(
  orders: T[],
  statusFilter: CustomerOrderStatusFilter,
) => {
  if (statusFilter === '') {
    return orders;
  }

  if (statusFilter === 'returns') {
    return orders.filter((order) => Boolean(order.activeReturn?.returnRequestId));
  }

  return orders.filter((order) => normalizeCustomerOrderStatus(order.status) === statusFilter);
};

export const CustomerOrdersStatusTabs: React.FC<{
  statusFilter: CustomerOrderStatusFilter;
  onChange: (value: CustomerOrderStatusFilter) => void;
  onRefresh: () => void;
}> = ({ statusFilter, onChange, onRefresh }) => {
  const tabs = useCustomerOrderStatusTabs();
  const { refreshLabel } = useCustomerOrdersText();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-6 py-4">
      {tabs.map((tab) => (
        <button
          key={tab.value || 'all'}
          onClick={() => onChange(tab.value)}
          className={`whitespace-nowrap rounded border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            statusFilter === tab.value
              ? 'border-primary/30 bg-primary/15 text-primary'
              : 'border-white/10 bg-transparent text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onRefresh}
        className="rounded border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        {refreshLabel}
      </button>
    </div>
  );
};

export const CustomerOrderCard: React.FC<{
  order: CustomerOrderListItem;
  isReturnExpanded: boolean;
  onToggleReturn: (orderId: number) => void;
  onViewOrder: (orderId: number) => void;
  onViewReturn: (orderId: number) => void;
}> = ({ order, isReturnExpanded, onToggleReturn, onViewOrder, onViewReturn }) => {
  const text = useCustomerOrdersText();
  const normalizedOrderStatus = normalizeCustomerOrderStatus(order.status);
  const statusMeta = getCustomerOrderStatusMeta(order.status);
  const paymentStatusMeta = getPaymentStatusMeta(order.paymentMethod, order.paymentStatus);
  const shouldShowPaymentBadge = Boolean(order.paymentMethod && order.paymentStatus)
    && !(
      normalizedOrderStatus === 'Cancelled'
      && ['PENDING_COD', 'PENDING_VNPAY', 'PENDING', 'UNPAID'].includes(paymentStatusMeta.canonicalStatus)
    );
  const activeReturn = order.activeReturn;
  const normalizedWorkflowStatus = normalizeReturnUiStatus(activeReturn?.workflowStatus);
  const normalizedStatusBucket = normalizeReturnUiStatus(activeReturn?.statusBucket);
  const normalizedRefundStatus = normalizeReturnUiStatus(activeReturn?.refundStatus);
  const returnBadgeStatus = normalizedWorkflowStatus || normalizedStatusBucket || normalizedRefundStatus;
  const returnBadgeLabel = activeReturn && returnBadgeStatus
    ? (
      normalizedWorkflowStatus || normalizedStatusBucket
        ? text.resolveReturnText(
            `status.${returnBadgeStatus}`,
            returnWorkflowFallbacks[returnBadgeStatus] ?? returnBadgeStatus,
          )
        : text.resolveReturnText(
            `refundStatus.${returnBadgeStatus}`,
            refundStatusFallbacks[returnBadgeStatus] ?? returnBadgeStatus,
          )
    )
    : null;
  const returnBadgeClassName = returnBadgeStatus
    ? getReturnCardBadgeClassName(returnBadgeStatus)
    : 'border-white/10 bg-white/[0.04] text-white/72';
  const activeRefundStatusLabel =
    activeReturn?.refundStatus && activeReturn.refundStatus !== 'NOT_APPLICABLE'
      ? text.resolveReturnText(
          `refundStatus.${activeReturn.refundStatus}`,
          refundStatusFallbacks[activeReturn.refundStatus] ?? activeReturn.refundStatus,
        )
      : null;
  const activeRefundUpdateMetaLabel =
    activeReturn?.financeNote && (activeReturn.financeNoteUpdatedAt || activeReturn.financeNoteUpdatedBy?.fullName)
      ? text.resolveReturnText(
          'detail.infoFinanceUpdateMeta',
          'Cập nhật {{date}} bởi {{actor}}',
          {
            date: activeReturn.financeNoteUpdatedAt
              ? new Date(activeReturn.financeNoteUpdatedAt).toLocaleString('vi-VN')
              : '—',
            actor: activeReturn.financeNoteUpdatedBy?.fullName ?? 'bộ phận hỗ trợ',
          },
        )
      : null;
  const {
    expectedRefundAmount: activeExpectedRefundAmount,
    legacyTotalRefundAmount: activeLegacyExpectedRefundAmount,
    showsRefundCapAdjustment,
  } = resolveExpectedRefundEconomics(activeReturn);
  const activeEconomicsSummary = activeReturn?.economicsSummary;
  const showsSnapshotBreakdown = Boolean(activeEconomicsSummary?.hasSnapshotBreakdown);
  const returnStatusNote = activeReturn
    && !activeReturn.financeNote
    && activeReturn.refundStatus !== 'LOCKED_UNTIL_PAYMENT_CONFIRMED'
    ? text.resolveReturnText(
        'detail.quickTrackingHint',
        'Theo dõi nhanh tiến trình hoàn trả và hoàn tiền ngay trong hồ sơ.',
      )
    : null;
  const hasItemCount = typeof order.itemCount === 'number';
  const orderCode = order.orderCode ?? order.orderNumber;
  const cardSecondaryButtonClassName =
    'rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/78 transition-colors hover:border-white/18 hover:bg-white/[0.06] hover:text-white';
  const cardPrimaryButtonClassName =
    'rounded-lg border border-cyan-400/18 bg-cyan-400/[0.08] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/[0.12]';

  return (
    <div className={`${refundUi.surface} p-5 transition-colors hover:border-white/20`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-white">#{order.orderNumber}</span>
              <span className="text-[11px] text-white/42">{order.createdAt ? formatVietnamTime(order.createdAt) : ''}</span>
              {activeReturn ? (
                <span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${returnBadgeClassName}`}>
                  {returnBadgeLabel || text.unknownLabel}
                </span>
              ) : (
                <>
                  <span
                    className={`rounded border px-2 py-1 text-[10px] uppercase tracking-widest ${
                      statusMeta
                        ? `${statusMeta.badgeClass} ${statusMeta.textClass}`
                        : 'border-white/10 text-white/70'
                    }`}
                  >
                    {statusMeta?.label || order.status || text.unknownLabel}
                  </span>
                  {shouldShowPaymentBadge && (
                    <PaymentStatusBadge
                      paymentMethod={order.paymentMethod}
                      paymentStatus={order.paymentStatus}
                      size="xs"
                      uppercase
                      className="tracking-widest"
                    />
                  )}
                </>
              )}
            </div>
            <div className="mt-2 text-sm text-white/70">
              {text.totalLabel}: <span className="font-semibold text-white">{formatCurrencyVND(Number(order.totalAmount ?? 0))}</span>
              {hasItemCount && (
                <>
                  <span className="mx-2 text-white/30">•</span>
                  {text.itemsLabel}: <span className="font-semibold text-white">{order.itemCount}</span>
                </>
              )}
            </div>
            <div className="mt-2 text-xs text-white/40">
              {text.orderCodeLabel}: {orderCode}
            </div>
          </div>

          <div className="flex shrink-0 items-end gap-2 md:min-w-[104px] md:flex-col">
            <button onClick={() => onViewOrder(order.orderId)} className={cardSecondaryButtonClassName}>
              {text.viewLabel}
            </button>
            {activeReturn?.returnRequestId && !isReturnExpanded && (
              <button
                onClick={() => onToggleReturn(order.orderId)}
                aria-expanded={false}
                aria-controls={`order-return-panel-${order.orderId}`}
                aria-label={text.showReturnInfoLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-none border-0 bg-transparent text-white/58 transition-colors hover:bg-transparent hover:text-white"
              >
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>

        {activeReturn && isReturnExpanded && (
          <div id={`order-return-panel-${order.orderId}`} className={`${refundUi.section} px-5 py-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className={refundUi.eyeBrow}>{text.returnStatusCardLabel}</div>
                <div className="mt-2 text-sm font-semibold text-white/88">
                  {returnBadgeLabel || text.unknownLabel}
                </div>
                {returnStatusNote && (
                  <div className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">
                    {returnStatusNote}
                  </div>
                )}
              </div>
              <div className={refundUi.subtleBadge}>
                {text.resolveReturnText(
                  `status.${activeReturn.workflowStatus ?? activeReturn.status}`,
                  String(activeReturn.workflowStatus ?? activeReturn.status),
                )}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {activeExpectedRefundAmount > 0 && (
                <div className={`inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 ${refundUi.success} px-4 py-3 text-xs text-emerald-50/95`}>
                  <span className={`${refundUi.eyeBrow} text-emerald-100/70`}>
                    {text.expectedRefundLabel}
                  </span>
                  <span className="font-semibold">
                    {activeExpectedRefundAmount.toLocaleString('vi-VN')}đ
                  </span>
                  {showsRefundCapAdjustment && (
                    <div className="basis-full text-[10px] text-white/55">
                      {text.resolveReturnText(
                        'detail.infoExpectedRefundLegacy',
                        'Theo tổng cũ: {{amount}}',
                        {
                          amount: `${activeLegacyExpectedRefundAmount.toLocaleString('vi-VN')}đ`,
                        },
                      )}
                    </div>
                  )}
                  {showsSnapshotBreakdown && (
                    <>
                      <div className="basis-full text-[10px] text-white/65">
                        {text.resolveReturnText(
                          'table.snapshotNetPaid',
                          'Thực trả theo đơn gốc: {{amount}}',
                          {
                            amount: formatCurrencyVND(Number(activeEconomicsSummary?.totalNetPaidAmount ?? 0)),
                          },
                        )}
                      </div>
                      <div className="basis-full text-[10px] text-white/55">
                        {text.resolveReturnText(
                          'table.snapshotGrossDiscount',
                          'Giá gốc {{gross}} · Giảm giá {{discount}}',
                          {
                            gross: formatCurrencyVND(Number(activeEconomicsSummary?.totalGrossAmount ?? 0)),
                            discount: formatCurrencyVND(Number(activeEconomicsSummary?.totalDiscountAmount ?? 0)),
                          },
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeRefundStatusLabel && (
                <div className={`${refundUi.sectionMuted} px-4 py-3 text-xs text-sky-50/90`}>
                  <span className={`mr-2 ${refundUi.eyeBrow} text-sky-100/70`}>
                    {text.refundStatusLabel}
                  </span>
                  <span>{activeRefundStatusLabel}</span>
                </div>
              )}
              {activeReturn.refundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED' && (
                <div className={`${refundUi.warning} px-4 py-3 text-xs text-amber-100`}>
                  <div>{text.refundLockedLabel}</div>
                  <div className="mt-2 text-[11px] text-amber-100/80">
                    {text.refundLockedHintLabel}
                  </div>
                  <button
                    onClick={() => onViewOrder(order.orderId)}
                    className="mt-3 rounded-lg border border-amber-300/25 bg-transparent px-3 py-2 text-[11px] font-medium text-amber-50 transition-colors hover:bg-amber-300/10"
                  >
                    {text.refundLockedActionLabel}
                  </button>
                </div>
              )}
              {activeReturn.financeNote && (
                <div className={`${refundUi.sectionMuted} px-4 py-3 text-xs text-sky-50`}>
                  <div className={`${refundUi.eyeBrow} text-sky-100/75`}>
                    {text.refundUpdateLabel}
                  </div>
                  <div className="mt-2 leading-relaxed">{activeReturn.financeNote}</div>
                  {activeRefundUpdateMetaLabel && (
                    <div className="mt-2 text-[10px] text-sky-100/70">
                      {activeRefundUpdateMetaLabel}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => onViewReturn(order.orderId)} className={cardPrimaryButtonClassName}>
                  {text.viewReturnLabel}
                </button>
                <button
                  onClick={() => onToggleReturn(order.orderId)}
                  aria-expanded
                  aria-controls={`order-return-panel-${order.orderId}`}
                  aria-label={text.hideReturnInfoLabel}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-none border-0 bg-transparent text-cyan-100 transition-colors hover:bg-transparent hover:text-white"
                >
                  <ChevronDown size={16} className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
