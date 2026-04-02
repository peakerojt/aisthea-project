import React from 'react';
import {
  ArrowLeft,
  Banknote,
  ClipboardList,
  Clock3,
  ImageIcon,
  Package,
  RefreshCcw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReturnStatusPill } from '@/common/components/ReturnStatusPill';
import { ReturnTimeline } from '@/common/components/ReturnTimeline';
import type {
  ReturnRefundTransaction,
  ReturnRequestAttachment,
  ReturnRequestDetail,
} from '@/common/services/return.types';
import { normalizeRefundTransactionStatus } from '@/common/services/return.refund-status';
import { getRefundTransactionMethodLabel } from '@/common/services/return.refund-transaction';
import {
  resolveExpectedRefundEconomics,
  summarizeReturnItemEconomics,
} from '@/common/utils/returnEconomics';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

const pageSectionClassName =
  'rounded-3xl border border-white/10 bg-[#101214] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.24)] sm:p-6';
const surfaceClassName =
  'rounded-3xl border border-white/10 bg-[#101214] shadow-[0_24px_64px_rgba(0,0,0,0.24)]';
const panelClassName = 'rounded-2xl border border-white/10 bg-white/[0.03]';
const mutedPanelClassName = 'rounded-2xl border border-white/8 bg-white/[0.02]';
const warningPanelClassName =
  'rounded-3xl border border-amber-300/20 bg-amber-300/[0.08] p-5 text-amber-50 shadow-[0_16px_40px_rgba(245,158,11,0.08)]';
const infoPanelClassName =
  'rounded-3xl border border-sky-300/18 bg-sky-300/[0.08] p-5 text-sky-50 shadow-[0_16px_40px_rgba(56,189,248,0.08)]';
const eyebrowClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42';
const sectionTitleClassName = 'text-xl font-semibold tracking-[-0.03em] text-white';

const joinClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(' ');

const useReturnDetailText = () => {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };

  return { resolveText };
};

const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const SectionHeading = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/68">
      <Icon size={17} />
    </div>
    <div className="space-y-1">
      <h2 className={sectionTitleClassName}>{title}</h2>
      {description && <p className="text-sm leading-6 text-white/52">{description}</p>}
    </div>
  </div>
);

export function ReturnDetailOverview({
  detail,
  onBack,
}: {
  detail: ReturnRequestDetail;
  onBack?: () => void;
}) {
  const { resolveText } = useReturnDetailText();
  const displayStatus = canonicalizeWorkflowStatusFallback(detail.workflowStatus ?? detail.status);
  const { expectedRefundAmount, legacyTotalRefundAmount, showsRefundCapAdjustment } =
    resolveExpectedRefundEconomics(detail);
  const itemEconomicsSummary = summarizeReturnItemEconomics(detail.items);
  const backLabel = resolveText('detail.backToList', 'Quay lại danh sách');
  const headerTitle = resolveText('detail.headerTitle', 'Yêu cầu #{{id}}', {
    id: detail.returnRequestId,
  });
  const headerSubtitle = resolveText('detail.headerSubtitle', 'Đơn hàng #{{orderId}} · Tạo lúc {{date}}', {
    orderId: detail.orderId,
    date: new Date(detail.createdAt).toLocaleString('vi-VN'),
  });
  const reasonLabel = resolveText('detail.infoReason', 'Lý do');
  const reasonValue = detail.reason ? resolveText(`reasons.${detail.reason}`, detail.reason) : '—';
  const createdAtLabel = resolveText('detail.infoCreatedAt', 'Ngày tạo');
  const statusLabel = resolveText('detail.infoStatus', 'Trạng thái');
  const refundStatusLabel = resolveText('detail.infoRefundStatus', 'Trạng thái hoàn tiền');
  const expectedRefundLabel = resolveText('detail.infoExpectedRefund', 'Hoàn tiền dự kiến');
  const expectedRefundLegacyLabel = resolveText('detail.infoExpectedRefundLegacy', 'Theo tổng cũ: {{amount}}', {
    amount: formatMoney(legacyTotalRefundAmount),
  });
  const expectedRefundHintLabel = resolveText(
    'detail.infoExpectedRefundHint',
    'Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.',
  );
  const noteLabel = resolveText('detail.infoNote', 'Ghi chú');

  return (
    <section className={joinClasses(surfaceClassName, 'overflow-hidden')}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <button
              onClick={() => onBack?.()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              <ArrowLeft size={15} />
              {backLabel}
            </button>
            <div className="space-y-2">
              <h1 className="text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.4rem]">
                {headerTitle}
              </h1>
              <p className="text-sm leading-7 text-white/56">{headerSubtitle}</p>
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <ReturnStatusPill status={displayStatus} className="px-4 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className={joinClasses(panelClassName, 'px-4 py-3')}>
            <div className={joinClasses('flex items-center gap-2 text-white/36', eyebrowClassName)}>
              <ClipboardList size={13} />
              {reasonLabel}
            </div>
            <div className="mt-2 text-[15px] font-semibold leading-6 text-white">
              {reasonValue}
            </div>
            </div>

            <div className={joinClasses(panelClassName, 'px-4 py-3')}>
            <div className={joinClasses('flex items-center gap-2 text-white/36', eyebrowClassName)}>
              <Clock3 size={13} />
              {createdAtLabel}
            </div>
            <div className="mt-2 text-sm font-semibold leading-6 text-white/82">
              {new Date(detail.createdAt).toLocaleString('vi-VN')}
            </div>
            </div>

            <div className={joinClasses(panelClassName, 'px-4 py-3')}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/36">{statusLabel}</div>
            <div className="mt-2">
              <ReturnStatusPill status={displayStatus} />
            </div>
            {detail.refundStatus && detail.refundStatus !== 'NOT_APPLICABLE' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/36">
                  {refundStatusLabel}
                </div>
                <ReturnStatusPill
                  status={detail.refundStatus}
                  kind="refund"
                  className="px-2.5 py-1 text-[11px]"
                />
              </div>
            )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.08] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/72">
              <Banknote size={13} />
              {expectedRefundLabel}
            </div>
            <div className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] text-emerald-100">
              {formatMoney(expectedRefundAmount)}
            </div>
            {itemEconomicsSummary.hasSnapshotBreakdown && (
              <div className="mt-4 space-y-1 text-xs leading-6 text-emerald-50/82">
                <div>
                  {resolveText('table.snapshotNetPaid', 'Thực trả theo đơn gốc: {{amount}}', {
                    amount: formatMoney(itemEconomicsSummary.totalNetPaidAmount),
                  })}
                </div>
                <div>
                  {resolveText('table.snapshotGrossDiscount', 'Giá gốc {{gross}} · Giảm giá {{discount}}', {
                    gross: formatMoney(itemEconomicsSummary.totalGrossAmount),
                    discount: formatMoney(itemEconomicsSummary.totalDiscountAmount),
                  })}
                </div>
              </div>
            )}
            {showsRefundCapAdjustment && (
              <div className="mt-4 space-y-1 text-xs leading-6 text-emerald-50/74">
                <div>{expectedRefundLegacyLabel}</div>
                <div>{expectedRefundHintLabel}</div>
              </div>
            )}
          </div>
        </div>

        {detail.note && (
          <div className={joinClasses('mt-4 p-4', mutedPanelClassName)}>
            <div className={eyebrowClassName}>{noteLabel}</div>
            <p className="mt-3 text-sm leading-7 text-white/78">{detail.note}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReturnDetailNotices({ detail }: { detail: ReturnRequestDetail }) {
  const navigate = useNavigate();
  const { resolveText } = useReturnDetailText();
  const translatedFinanceNote = translateLegacyReturnCopy(detail.financeNote, resolveText);
  const financeMetaLabel = resolveText('detail.infoFinanceUpdateMeta', 'Cập nhật {{date}} bởi {{actor}}', {
    date: detail.financeNoteUpdatedAt ? new Date(detail.financeNoteUpdatedAt).toLocaleString('vi-VN') : '—',
    actor: detail.financeNoteUpdatedBy?.fullName ?? 'bộ phận hỗ trợ',
  });
  const refundLockedLabel = resolveText(
    'detail.refundLocked',
    'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.',
  );
  const refundLockedHintLabel = resolveText(
    'detail.refundLockedHint',
    'Mở đơn hàng và xác nhận đã nhận hàng để tiếp tục xử lý hoàn trả.',
  );
  const refundLockedActionLabel = resolveText(
    'detail.goToOrderForPaymentConfirmation',
    'Mở đơn hàng để xác nhận đã nhận hàng',
  );
  const financeUpdateLabel = resolveText('detail.infoFinanceUpdate', 'Cập nhật hoàn tiền');

  return (
    <>
      {detail.refundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED' && (
        <section className={warningPanelClassName}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/20 bg-black/10 text-amber-50/90">
              <ShieldAlert size={18} />
            </div>
            <div className="space-y-3">
              <div className="text-base font-semibold">{refundLockedLabel}</div>
              <p className="text-sm leading-6 text-amber-50/78">{refundLockedHintLabel}</p>
              <button
                onClick={() => navigate(`/orders/${detail.orderId}`)}
                className="inline-flex items-center rounded-full border border-amber-100/20 bg-black/10 px-4 py-2 text-sm font-medium text-amber-50 transition-colors hover:border-amber-100/30 hover:bg-black/20"
              >
                {refundLockedActionLabel}
              </button>
            </div>
          </div>
        </section>
      )}

      {detail.financeNote && (
        <section className={infoPanelClassName}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200/20 bg-black/10 text-sky-50/92">
              <RefreshCcw size={17} />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100/76">
                {financeUpdateLabel}
              </div>
              <p className="text-sm leading-7 text-sky-50/90">{translatedFinanceNote ?? detail.financeNote}</p>
              {(detail.financeNoteUpdatedAt || detail.financeNoteUpdatedBy?.fullName) && (
                <p className="text-xs leading-6 text-sky-100/66">{financeMetaLabel}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export function ReturnAttachmentGallery({
  attachments,
}: {
  attachments?: ReturnRequestAttachment[];
}) {
  const { resolveText } = useReturnDetailText();
  const [previewImage, setPreviewImage] = React.useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const title = resolveText('detail.attachmentsTitle', 'Ảnh minh chứng');
  const description = resolveText(
    'detail.attachmentsDescription',
    'Nhấn vào ảnh để xem rõ minh chứng khách hàng đã gửi ngay trên trang này.',
  );
  const openHint = resolveText('detail.attachmentsOpenHint', 'Nhấn vào ảnh để xem lớn');
  const countLabel = resolveText('detail.attachmentsCount', '{{count}} ảnh', {
    count: safeAttachments.length,
  });
  const emptyLabel = resolveText(
    'detail.attachmentsEmpty',
    'Chưa có ảnh minh chứng nào được đính kèm cho yêu cầu này.',
  );
  const previewDialogLabel = resolveText('detail.attachmentPreviewTitle', 'Xem ảnh minh chứng');
  const closePreviewLabel = resolveText('detail.closeAttachmentPreview', 'Đóng xem ảnh minh chứng');

  React.useEffect(() => {
    if (!previewImage) {
      setIsPreviewVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => setIsPreviewVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [previewImage]);

  return (
    <>
      <section className={pageSectionClassName}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/68">
                <ImageIcon size={17} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={sectionTitleClassName}>{title}</h2>
                  <span className="text-sm text-white/48">{countLabel}</span>
                </div>
                <p className="text-sm leading-6 text-white/52">{description}</p>
                {safeAttachments.length > 0 && (
                  <p className="text-xs leading-5 text-white/44">{openHint}</p>
                )}
              </div>
            </div>
          </div>

          {safeAttachments.length > 0 ? (
            <div
              className={joinClasses(
                'grid gap-3',
                safeAttachments.length === 1 ? 'max-w-md grid-cols-1' : undefined,
                safeAttachments.length === 2 ? 'max-w-3xl sm:grid-cols-2' : undefined,
                safeAttachments.length > 2 ? 'sm:grid-cols-2 xl:grid-cols-3' : undefined,
              )}
            >
              {safeAttachments.map((attachment, index) => {
                const attachmentAlt = resolveText('detail.attachmentAlt', 'Ảnh minh chứng {{index}}', {
                  index: index + 1,
                });
                const previewButtonLabel = resolveText(
                  'detail.openAttachmentPreview',
                  'Xem ảnh minh chứng {{index}}',
                  { index: index + 1 },
                );

                return (
                  <button
                    key={attachment.attachmentId ?? index}
                    type="button"
                    aria-label={previewButtonLabel}
                    onClick={() =>
                      setPreviewImage({
                        src: attachment.fileUrl,
                        alt: attachmentAlt,
                      })}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-white/[0.02]">
                      <img
                        src={attachment.fileUrl}
                        alt={attachmentAlt}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.015]"
                        onError={(event) => {
                          const target = event.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                        <Search
                          size={18}
                          className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={joinClasses(mutedPanelClassName, 'p-5 text-sm italic text-white/58')}>
              {emptyLabel}
            </div>
          )}
        </div>
      </section>

      {previewImage && (
        <div
          role="presentation"
          className={`fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 p-4 transition-all duration-200 ease-out ${
            isPreviewVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewImage(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewDialogLabel}
            className={`relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
              isPreviewVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200/10 px-6 pb-4 pt-5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/80">
                  {previewDialogLabel}
                </h2>
                <p className="mt-1 truncate text-sm text-white/52">{previewImage.alt}</p>
              </div>
              <button
                type="button"
                aria-label={closePreviewLabel}
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="max-h-[75vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const getRefundTransactionToneClasses = (status: string) => {
  const normalizedStatus = normalizeRefundTransactionStatus(status);

  if (normalizedStatus === 'FAILED') {
    return 'border-red-300/18 bg-red-300/[0.08] text-red-50';
  }
  if (normalizedStatus === 'PENDING' || normalizedStatus === 'PROCESSING') {
    return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50';
  }
  return 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50';
};

const getRefundTransactionStatusFallback = (status: string) => {
  const normalizedStatus = normalizeRefundTransactionStatus(status);
  const fallbackByStatus: Record<string, string> = {
    COMPLETED: 'Hoàn tiền thành công',
    SUCCESS: 'Hoàn tiền thành công',
    PENDING: 'Chờ hoàn tiền',
    PROCESSING: 'Đang hoàn tiền',
    FAILED: 'Hoàn tiền thất bại',
  };
  return {
    normalizedStatus,
    fallback: fallbackByStatus[normalizedStatus] ?? normalizedStatus,
  };
};

export function ReturnRefundTransactions({
  transactions,
}: {
  transactions?: ReturnRefundTransaction[];
}) {
  const { resolveText } = useReturnDetailText();
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  if (!safeTransactions.length) {
    return null;
  }

  return (
    <section className={pageSectionClassName}>
      <div className="space-y-5">
        <SectionHeading
          icon={Banknote}
          title={resolveText('detail.transactionsTitle', 'Giao dịch hoàn tiền')}
          description={resolveText(
            'detail.transactionsDescription',
            'Theo dõi từng lần hệ thống xử lý hoàn tiền cho yêu cầu này.',
          )}
        />

        <div className="space-y-3">
          {safeTransactions.map((transaction, index) => {
            const { normalizedStatus, fallback } = getRefundTransactionStatusFallback(transaction.status);
            return (
              <div
                key={transaction.transactionId ?? transaction.refundTransactionId ?? `${transaction.method}-${index}`}
                className={joinClasses('rounded-2xl border p-4', getRefundTransactionToneClasses(transaction.status))}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-black/10">
                      <Banknote size={17} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{formatMoney(Number(transaction.amount ?? 0))}</div>
                      <div className="mt-1 text-sm opacity-85">
                        {getRefundTransactionMethodLabel(transaction.method, resolveText)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-left sm:text-right">
                    <div className="text-sm font-semibold">
                      {resolveText(`detail.transactionStatus.${normalizedStatus}`, fallback)}
                    </div>
                    {transaction.transactionRef && (
                      <div className="text-xs opacity-72">{transaction.transactionRef}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ReturnTimelineSection({ detail }: { detail: ReturnRequestDetail }) {
  const { resolveText } = useReturnDetailText();

  return (
    <section className={pageSectionClassName}>
      <div className="space-y-4">
        <SectionHeading
          icon={RefreshCcw}
          title={resolveText('detail.timelineTitle', 'Lịch sử trạng thái')}
          description={resolveText(
            'detail.timelineDescription',
            'Theo dõi tiến trình xử lý và các cập nhật đã được thực hiện cho yêu cầu này.',
          )}
        />
        <ReturnTimeline logs={detail.statusLogs ?? []} />
      </div>
    </section>
  );
}

export function ReturnItemsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <SectionHeading icon={Package} title={title} description={description} />
      {children}
    </section>
  );
}
