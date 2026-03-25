import React from 'react';
import { ClipboardList } from 'lucide-react';
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
    getAdminReturnStatusBadgeTone,
    getAdminReturnStatusLabel,
} from '@/admin/utils/adminReturn.utils';
import { ReturnStatusFilter, useAdminReturns } from '@/admin/hooks/useAdminReturns';
import { ReasonLabel } from '@/common/components/ReasonLabel';

export const Returns: React.FC = () => {
    const {
        changeStatusFilter,
        handleAction,
        isRefreshing,
        loading,
        page,
        pendingCount,
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
    const rowNumberLabel = resolveText('table.rowNumber', '#');
    const orderCustomerLabel = resolveText('table.orderCustomer', 'Mã đơn / Khách hàng');
    const reasonLabel = resolveText('table.reason', 'Lý do');
    const requestDateLabel = resolveText('table.requestDate', 'Ngày yêu cầu');
    const statusLabel = resolveText('table.status', 'Trạng thái');
    const actionsLabel = resolveText('table.actions', 'Thao tác');
    const guestLabel = resolveText('table.guest', 'Khách vãng lai');
    const proofImagesLabel = (count: number) => resolveText('table.proofImages', '{{count}} ảnh', { count });
    const viewDetailLabel = resolveText('table.viewDetail', 'Xem chi tiết');
    const previousLabel = resolveText('pagination.previous', 'Trước');
    const nextLabel = resolveText('pagination.next', 'Sau');
    const pageLabel = resolveText('pagination.page', 'Trang {{page}} / {{total}}', { page, total: totalPages });

    const pageControls = (
        <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
            <AdminPageHeader
                icon={ClipboardList}
                title={titleLabel}
                subtitle={subtitleLabel}
                actions={pendingCount > 0 ? (
                    <AdminBadge tone="warning" dot className="px-3 py-2 text-xs uppercase tracking-[0.14em]">
                        {pendingBadgeLabel}
                    </AdminBadge>
                ) : undefined}
            />

            <AdminTabs
                items={statusTabs}
                activeKey={statusFilter}
                onChange={(key) => changeStatusFilter(key as ReturnStatusFilter)}
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
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                {rowNumberLabel}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                {orderCustomerLabel}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30 hidden md:block">
                                {reasonLabel}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                {requestDateLabel}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                {statusLabel}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                {actionsLabel}
                            </div>
                        </div>

                        <div className="divide-y divide-white/[0.03]">
                            {returns.map((ret, index) => (
                                <div
                                    key={ret.returnId}
                                    className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="text-xs text-white/30 font-mono w-8">
                                        {(page - 1) * 15 + index + 1}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white font-mono">
                                            #{ret.order?.orderNumber ?? `RET-${ret.returnId}`}
                                        </div>
                                        <div className="text-xs text-white/50 mt-1 truncate">
                                            {ret.user?.fullName ?? guestLabel}
                                        </div>
                                        <div className="text-[10px] text-white/30 mt-0.5">
                                            {ret.user?.email ?? '—'}
                                        </div>
                                    </div>

                                    <div className="hidden md:block min-w-0">
                                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                                            <ReasonLabel reason={ret.reason} />
                                        </p>
                                        {ret.proofImages.length > 0 && (
                                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-white/30">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                {proofImagesLabel(ret.proofImages.length)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-white/50 whitespace-nowrap">
                                        {formatAdminReturnDateTime(ret.createdAt)}
                                    </div>

                                    <div>
                                        <AdminBadge
                                            tone={getAdminReturnStatusBadgeTone(ret.status)}
                                            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                                        >
                                            {getAdminReturnStatusLabel(ret.status, t)}
                                        </AdminBadge>
                                    </div>

                                    <div>
                                        <AdminActionButton
                                            onClick={() => setSelectedReturn(ret)}
                                            className="cursor-pointer whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            {viewDetailLabel}
                                        </AdminActionButton>
                                    </div>
                                </div>
                            ))}
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
                    item={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                    onAction={handleAction}
                />
            )}
        </AdminPageShell>
    );
};
