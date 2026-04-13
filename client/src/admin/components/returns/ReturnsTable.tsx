import React from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { AdminActionButton, AdminBadge } from '@/admin/components/AdminUI';
import {
  formatAdminReturnDateTime,
  getAdminRefundStatusBadgeTone,
  getAdminRefundStatusLabel,
  getAdminReturnStatusBadgeTone,
  getAdminReturnStatusLabel,
} from '@/admin/utils/returns.utils';
import { ReasonLabel } from '@/common/components/ReasonLabel';
import type { OrderReturn } from '@/common/services/return.types';
import { resolveExpectedRefundEconomics } from '@/common/utils/returnEconomics';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

const refundToneCardClasses: Record<
  string,
  { shell: string; eyebrow: string; dot: string; value: string }
> = {
  info: {
    shell: 'border-sky-400/20 bg-sky-500/12',
    eyebrow: 'text-sky-100/58',
    dot: 'bg-sky-300',
    value: 'text-sky-50',
  },
  warning: {
    shell: 'border-amber-400/20 bg-amber-500/12',
    eyebrow: 'text-amber-100/58',
    dot: 'bg-amber-300',
    value: 'text-amber-50',
  },
  success: {
    shell: 'border-emerald-400/20 bg-emerald-500/12',
    eyebrow: 'text-emerald-100/58',
    dot: 'bg-emerald-300',
    value: 'text-emerald-50',
  },
  danger: {
    shell: 'border-rose-400/20 bg-rose-500/12',
    eyebrow: 'text-rose-100/58',
    dot: 'bg-rose-300',
    value: 'text-rose-50',
  },
  default: {
    shell: 'border-white/[0.08] bg-white/[0.04]',
    eyebrow: 'text-white/38',
    dot: 'bg-white/55',
    value: 'text-white',
  },
};

const formatDateParts = (iso?: string | null) => {
  if (!iso) {
    return { time: '—', date: '—' };
  }

  try {
    const date = new Date(iso);
    return {
      time: new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date),
      date: new Intl.DateTimeFormat('vi-VN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }).format(date),
    };
  } catch {
    return { time: String(iso), date: '—' };
  }
};

const getReturnRowSurface = (status?: string | null) => {
  switch (status) {
    case 'REQUESTED':
      return 'border-l-2 border-l-amber-400/45';
    case 'APPROVED':
      return 'border-l-2 border-l-sky-400/45';
    case 'REJECTED':
      return 'border-l-2 border-l-rose-400/45';
    case 'RECEIVED':
      return 'border-l-2 border-l-violet-400/40';
    case 'REFUNDED':
      return 'border-l-2 border-l-emerald-400/45';
    default:
      return 'border-l-2 border-l-white/[0.08]';
  }
};

const rowCellSurfaceClasses = 'bg-[#111318] transition-colors group-hover:bg-[#15181d]';

const shortenOrderNumber = (orderNumber: string) => {
  if (orderNumber.length <= 12) {
    return orderNumber;
  }

  return `${orderNumber.slice(0, 6)}...${orderNumber.slice(-3)}`;
};

interface ReturnsTableProps {
  actionsLabel: string;
  expandedReturnIds: Set<number>;
  financeNoteLabel: string;
  financeNoteMetaLabel: (date: string, actor: string) => string;
  guestLabel: string;
  hideMoreLabel: string;
  onSelectReturn: (item: OrderReturn) => void;
  onToggleExpandedReturn: (returnId: number) => void;
  orderCustomerLabel: string;
  reasonLabel: string;
  refundAmountLabel: string;
  refundStatusDetailLabel: string;
  requestDateLabel: string;
  resolveText: (key: string, fallback: string, options?: Record<string, unknown>) => string;
  returns: OrderReturn[];
  showMoreLabel: string;
  statusLabel: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  viewDetailLabel: string;
}

export const ReturnsTable: React.FC<ReturnsTableProps> = ({
  actionsLabel,
  expandedReturnIds,
  financeNoteLabel,
  financeNoteMetaLabel,
  guestLabel,
  hideMoreLabel,
  onSelectReturn,
  onToggleExpandedReturn,
  orderCustomerLabel,
  reasonLabel,
  refundAmountLabel,
  refundStatusDetailLabel,
  requestDateLabel,
  resolveText,
  returns,
  showMoreLabel,
  statusLabel,
  t,
  viewDetailLabel,
}) => {
  const [copiedReturnId, setCopiedReturnId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (copiedReturnId === null || typeof window === 'undefined') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedReturnId(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copiedReturnId]);

  const handleCopyOrderNumber = React.useCallback(async (returnId: number, orderNumber: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedReturnId(returnId);
    } catch {
      // Ignore clipboard failures to keep table interactions lightweight.
    }
  }, []);

  const copyOrderLabel = resolveText('table.copyOrderNumber', 'Sao chép mã đơn');
  const copiedOrderLabel = resolveText('table.copiedOrderNumber', 'Đã chép');

  return (
    <div
      data-testid="admin-returns-table-scroll"
      className="max-h-[68vh] overflow-x-hidden overflow-y-auto"
      style={{ scrollbarGutter: 'stable both-edges' }}
    >
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[29%]" />
          <col className="w-[13%]" />
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[#111318]">
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="sticky left-0 z-20 bg-[#111318] px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              {orderCustomerLabel}
            </th>
            <th className="bg-[#111318] px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              {reasonLabel}
            </th>
            <th className="bg-[#111318] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              {requestDateLabel}
            </th>
            <th className="bg-[#111318] px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              {statusLabel}
            </th>
            <th className="bg-[#111318] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/30 whitespace-nowrap">
              {refundAmountLabel}
            </th>
            <th className="sticky right-0 z-20 bg-[#111318] px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              {actionsLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {returns.map((ret) => {
            const displayStatus = ret.workflowStatus ?? ret.status;
            const financeNoteCopy = translateLegacyReturnCopy(ret.financeNote, resolveText);
            const { expectedRefundAmount } = resolveExpectedRefundEconomics(ret);
            const requestedAt = formatDateParts(ret.createdAt);
            const hasRefundStatus =
              Boolean(ret.refundStatus) && ret.refundStatus !== 'NOT_APPLICABLE';
            const hasFinanceNote = Boolean(ret.financeNote);
            const isExpanded = expandedReturnIds.has(ret.returnId);
            const orderNumber = ret.order?.orderNumber ?? `RET-${ret.returnId}`;
            const refundStatusTone = hasRefundStatus && ret.refundStatus
              ? getAdminRefundStatusBadgeTone(ret.refundStatus)
              : 'default';
            const refundStatusCardClass =
              refundToneCardClasses[refundStatusTone] ?? refundToneCardClasses.default;
            const isCopied = copiedReturnId === ret.returnId;

            return (
              <React.Fragment key={ret.returnId}>
                <tr className="group border-b border-white/[0.06]">
                  <td className={`sticky left-0 z-[1] px-4 py-4 align-middle ${rowCellSurfaceClasses}`}>
                    <div className={`min-w-0 rounded-l-2xl pl-3.5 ${getReturnRowSurface(displayStatus)}`}>
                      <div className="inline-flex max-w-full items-center gap-1.5 align-middle">
                        <div
                          className="min-w-0 truncate font-mono text-[13px] font-semibold text-white/95"
                          title={`#${orderNumber}`}
                        >
                          #{shortenOrderNumber(orderNumber)}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopyOrderNumber(ret.returnId, orderNumber)}
                          aria-label={`${isCopied ? copiedOrderLabel : copyOrderLabel}: ${orderNumber}`}
                          title={`${isCopied ? copiedOrderLabel : copyOrderLabel}: ${orderNumber}`}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/42 transition-colors hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="mt-1.5 truncate text-sm font-semibold text-white">
                        {ret.user?.fullName ?? guestLabel}
                      </div>
                    </div>
                  </td>

                  <td className={`px-4 py-4 align-middle ${rowCellSurfaceClasses}`}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold leading-6 text-white" title={ret.reason}>
                        <ReasonLabel reason={ret.reason} />
                      </div>
                      {hasFinanceNote && (
                        <div className="mt-2 inline-flex max-w-full items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100/78">
                          {financeNoteLabel}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className={`px-5 py-4 align-middle ${rowCellSurfaceClasses}`}>
                    <div className="whitespace-nowrap text-sm font-semibold text-white/88">
                      {requestedAt.date}
                    </div>
                    <div className="mt-1.5 whitespace-nowrap text-xs text-white/48">
                      {requestedAt.time}
                    </div>
                  </td>

                  <td className={`px-4 py-4 align-middle ${rowCellSurfaceClasses}`}>
                    <div className="flex min-h-[40px] items-center">
                      <AdminBadge
                        tone={getAdminReturnStatusBadgeTone(displayStatus)}
                        className="w-fit max-w-full justify-center rounded-full px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap"
                      >
                        {getAdminReturnStatusLabel(displayStatus, t)}
                      </AdminBadge>
                    </div>
                  </td>

                  <td className={`px-5 py-4 align-middle ${rowCellSurfaceClasses}`}>
                    <div className="whitespace-nowrap text-[15px] font-bold text-emerald-200">
                      {expectedRefundAmount > 0
                        ? `${expectedRefundAmount.toLocaleString('vi-VN')}đ`
                        : '—'}
                    </div>
                  </td>

                  <td className={`sticky right-0 z-[1] px-3 py-4 align-middle text-right ${rowCellSurfaceClasses}`}>
                    <div className="flex min-h-[40px] items-center justify-end gap-1.5 whitespace-nowrap">
                      <AdminActionButton
                        onClick={() => onSelectReturn(ret)}
                        className="cursor-pointer whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.07em] text-white/78 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
                      >
                        {viewDetailLabel}
                      </AdminActionButton>
                      <button
                        type="button"
                        onClick={() => onToggleExpandedReturn(ret.returnId)}
                        aria-expanded={isExpanded}
                        aria-controls={`admin-return-panel-${ret.returnId}`}
                        aria-label={isExpanded ? hideMoreLabel : showMoreLabel}
                        title={isExpanded ? hideMoreLabel : showMoreLabel}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/58 transition-colors hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                      >
                        <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>

                {isExpanded && (hasRefundStatus || hasFinanceNote) && (
                  <tr className="border-b border-white/[0.06] bg-white/[0.018]">
                    <td colSpan={6} className="px-4 py-4">
                      <div
                        id={`admin-return-panel-${ret.returnId}`}
                        className={`grid gap-3 ${
                          hasFinanceNote && hasRefundStatus
                            ? 'grid-cols-1 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start xl:gap-2'
                            : 'grid-cols-1'
                        }`}
                      >
                        {hasRefundStatus && ret.refundStatus && (
                          <div className={`inline-flex w-fit max-w-full flex-col rounded-2xl border px-4 py-3 text-xs text-white xl:justify-self-start ${refundStatusCardClass.shell}`}>
                            <span className={`text-[10px] uppercase tracking-[0.16em] ${refundStatusCardClass.eyebrow}`}>
                              {refundStatusDetailLabel}
                            </span>
                            <div className="mt-2 flex flex-wrap items-center gap-2.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${refundStatusCardClass.dot}`} />
                              <span className={`text-sm font-semibold ${refundStatusCardClass.value}`}>
                                {getAdminRefundStatusLabel(ret.refundStatus, t)}
                              </span>
                            </div>
                          </div>
                        )}
                        {hasFinanceNote && (
                          <div
                            className="inline-flex min-w-0 max-w-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/70"
                            title={`${financeNoteLabel}: ${financeNoteCopy ?? ret.financeNote}`}
                          >
                            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/38">
                              <span>{financeNoteLabel}</span>
                              {(ret.financeNoteUpdatedAt || ret.financeNoteUpdatedBy?.fullName) && (
                                <span className="inline-flex rounded-full border border-white/[0.08] bg-black/20 px-2 py-1 text-[10px] normal-case tracking-normal text-white/42">
                                  {financeNoteMetaLabel(
                                    ret.financeNoteUpdatedAt
                                      ? formatAdminReturnDateTime(ret.financeNoteUpdatedAt)
                                      : '—',
                                    ret.financeNoteUpdatedBy?.fullName ?? '—',
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm leading-relaxed text-white/80">
                              {financeNoteCopy ?? ret.financeNote}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
