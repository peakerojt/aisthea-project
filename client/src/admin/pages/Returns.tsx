import React, { useState } from 'react';
import { ChevronDown, ClipboardList, ImageIcon } from 'lucide-react';
import {
    AdminActionButton,
    AdminBadge,
    AdminEmptyState,
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    AdminTabs,
} from '@/admin/components/AdminUI';
import { AdminReturnReviewModal } from '@/admin/components/AdminReturnReviewModal';
import {
    formatAdminReturnDateTime,
    getAdminRefundStatusBadgeTone,
    getAdminRefundStatusLabel,
    getAdminReturnStatusBadgeTone,
    getAdminReturnStatusLabel,
} from '@/admin/utils/returns.utils';
import { ReturnStatusFilter, useAdminReturns } from '@/admin/hooks/useReturns';
import { ReasonLabel } from '@/common/components/ReasonLabel';
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

export const Returns: React.FC = () => {
    const [expandedReturnIds, setExpandedReturnIds] = useState<Set<number>>(new Set());
    const {
        canManageRefundWorkflow,
        canManageReturnWorkflow,
        changeStatusFilter,
        isRefreshing,
        loading,
        page,
        pendingCount,
        reviewActions,
        returns,
        selectedReturn,
        setPage,
        setSelectedReturn,
        statusFilter,
        statusTabs,
        totalPages,
        t,
    } = useAdminReturns();
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const titleLabel = resolveText('page.title', 'Quản lý trả hàng');
    const subtitleLabel = resolveText('page.subtitle', 'Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền');
    const pendingBadgeLabel = resolveText('page.pendingBadge', '{{count}} chờ duyệt', { count: pendingCount });
    const emptyLabel = resolveText('table.empty', 'Không có yêu cầu trả hàng nào.');
    const orderCustomerLabel = resolveText('table.orderCustomer', 'Mã đơn / Khách hàng');
    const reasonLabel = resolveText('table.reason', 'Lý do');
    const requestDateLabel = resolveText('table.requestDate', 'Ngày yêu cầu');
    const statusLabel = resolveText('table.status', 'Trạng thái');
    const refundAmountLabel = resolveText('table.expectedRefund', 'Hoàn tiền dự kiến');
    const actionsLabel = resolveText('table.actions', 'Thao tác');
    const financeNoteLabel = resolveText('table.financeNote', 'Ghi chú tài chính');
    const financeNoteMetaLabel = (date: string, actor: string) =>
        resolveText('table.financeNoteMeta', 'Cập nhật {{date}} · {{actor}}', { date, actor });
    const guestLabel = resolveText('table.guest', 'Khách vãng lai');
    const proofImagesLabel = (count: number) => resolveText('table.proofImages', '{{count}} ảnh', { count });
    const viewDetailLabel = resolveText('table.viewDetail', 'Xem chi tiết');
    const showMoreLabel = resolveText('table.showMore', 'Xem thêm thông tin hoàn trả');
    const hideMoreLabel = resolveText('table.hideMore', 'Ẩn thông tin hoàn trả');
    const previousLabel = resolveText('pagination.previous', 'Trước');
    const nextLabel = resolveText('pagination.next', 'Sau');
    const pageLabel = resolveText('pagination.page', 'Trang {{page}} / {{total}}', { page, total: totalPages });
    const refundStatusDetailLabel = resolveText('table.refundStatusDetail', 'Trạng thái hoàn tiền');
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
    const toggleExpandedReturn = (returnId: number) => {
        setExpandedReturnIds((current) => {
            const next = new Set(current);
            if (next.has(returnId)) {
                next.delete(returnId);
            } else {
                next.add(returnId);
            }
            return next;
        });
    };

    const pageControls = (
        <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
            <AdminPageHeader
                icon={ClipboardList}
                title={titleLabel}
                subtitle={subtitleLabel}
                actions={pendingCount > 0 ? (
                    <AdminBadge tone="warning" dot className="px-4 py-2 text-sm uppercase tracking-[0.14em]">
                        {pendingBadgeLabel}
                    </AdminBadge>
                ) : undefined}
            />

            <AdminTabs
                items={statusTabs}
                activeKey={statusFilter}
                onChange={(key) => changeStatusFilter(key as ReturnStatusFilter)}
                className="gap-2.5 [&_button]:px-4 [&_button]:py-2 [&_button]:text-[15px] [&_button]:font-semibold [&_button]:text-white/58 [&_button]:shadow-none [&_button>span:last-child]:px-1.5 [&_button>span:last-child]:py-0.5 [&_button>span:last-child]:text-[10px] [&_[data-admin-tab-active='true']]:border-primary/35 [&_[data-admin-tab-active='true']]:bg-primary/10 [&_[data-admin-tab-active='true']]:text-white [&_[data-admin-tab-active='false']]:border-white/[0.08] [&_[data-admin-tab-active='false']]:bg-white/[0.025]"
            />
        </div>
    );

    return (
        <AdminPageShell className="min-h-screen bg-bg-dark text-white">
            <AdminSectionCard className="overflow-hidden" bodyClassName="h-full">
                {pageControls}
                {isRefreshing && !loading && <div className="h-px w-full bg-primary/60" />}
                {loading ? (
                    <div className="p-8 space-y-3 animate-pulse">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="h-14 bg-white/5 rounded" />
                        ))}
                    </div>
                ) : returns.length === 0 ? (
                    <AdminEmptyState
                        icon={ClipboardList}
                        title={emptyLabel}
                        description={subtitleLabel}
                    />
                ) : (
                    <>
                        <div data-testid="admin-returns-table-scroll" className="overflow-x-auto">
                            <table className="min-w-[1080px] w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                            {orderCustomerLabel}
                                        </th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                            {reasonLabel}
                                        </th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                            {requestDateLabel}
                                        </th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                            {statusLabel}
                                        </th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                                            {refundAmountLabel}
                                        </th>
                                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
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
                                    const refundStatusTone = hasRefundStatus && ret.refundStatus
                                        ? getAdminRefundStatusBadgeTone(ret.refundStatus)
                                        : 'default';
                                    const refundStatusCardClass =
                                        refundToneCardClasses[refundStatusTone] ?? refundToneCardClasses.default;

                                    return (
                                        <React.Fragment key={ret.returnId}>
                                            <tr className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]">
                                                <td className="px-6 py-5 align-top">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-white font-mono truncate">
                                                            #{ret.order?.orderNumber ?? `RET-${ret.returnId}`}
                                                        </div>
                                                        <div className="mt-2 text-sm font-semibold text-white truncate">
                                                            {ret.user?.fullName ?? guestLabel}
                                                        </div>
                                                        <div className="mt-1 text-xs text-white/38 truncate">
                                                            {ret.user?.email ?? '—'}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 align-top">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold leading-snug text-white">
                                                            <ReasonLabel reason={ret.reason} />
                                                        </p>
                                                        {ret.proofImages.length > 0 && (
                                                            <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-white/42">
                                                                <ImageIcon className="h-3.5 w-3.5" />
                                                                {proofImagesLabel(ret.proofImages.length)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 align-top">
                                                    <div className="text-sm font-medium text-white/88 whitespace-nowrap">
                                                        {requestedAt.time}
                                                    </div>
                                                    <div className="mt-2 text-xs text-white/42 whitespace-nowrap">
                                                        {requestedAt.date}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 align-top">
                                                    <AdminBadge
                                                        tone={getAdminReturnStatusBadgeTone(displayStatus)}
                                                        className="w-fit max-w-full justify-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] leading-none text-center whitespace-nowrap"
                                                    >
                                                        {getAdminReturnStatusLabel(displayStatus, t)}
                                                    </AdminBadge>
                                                </td>

                                                <td className="px-6 py-5 align-top">
                                                    <div className="text-sm font-bold text-emerald-200 whitespace-nowrap">
                                                        {expectedRefundAmount > 0
                                                            ? `${expectedRefundAmount.toLocaleString('vi-VN')}đ`
                                                            : '—'}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 align-top text-right">
                                                    <div className="flex items-start justify-end gap-2">
                                                        <AdminActionButton
                                                            onClick={() => setSelectedReturn(ret)}
                                                            className="cursor-pointer whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                                                        >
                                                            {viewDetailLabel}
                                                        </AdminActionButton>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpandedReturn(ret.returnId)}
                                                            aria-expanded={isExpanded}
                                                            aria-controls={`admin-return-panel-${ret.returnId}`}
                                                            aria-label={isExpanded ? hideMoreLabel : showMoreLabel}
                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/58 transition-colors hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                                                        >
                                                            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && (hasRefundStatus || hasFinanceNote) && (
                                                <tr className="border-b border-white/[0.06] bg-white/[0.018]">
                                                    <td colSpan={6} className="px-6 py-4">
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
                    </>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] px-6 py-5">
                        <AdminActionButton
                            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                            disabled={page <= 1}
                            size="md"
                            className="cursor-pointer text-xs font-bold uppercase tracking-widest"
                        >
                            {previousLabel}
                        </AdminActionButton>
                        <span className="text-xs text-white/40 px-3">
                            {pageLabel}
                        </span>
                        <AdminActionButton
                            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                            disabled={page >= totalPages}
                            size="md"
                            className="cursor-pointer text-xs font-bold uppercase tracking-widest"
                        >
                            {nextLabel}
                        </AdminActionButton>
                    </div>
                )}
            </AdminSectionCard>

            {selectedReturn && (
                <AdminReturnReviewModal
                    actions={reviewActions}
                    canManageRefundWorkflow={canManageRefundWorkflow}
                    canManageReturnWorkflow={canManageReturnWorkflow}
                    item={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                />
            )}
        </AdminPageShell>
    );
};
