import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import {
    AdminActionButton,
    AdminBadge,
    AdminEmptyState,
    AdminModalShell,
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
    AdminSectionCard,
    AdminTabs,
} from '@/admin/components/AdminUI';
import { adminReturnService, OrderReturn } from '@/common/services/return.service';
import { ReasonLabel } from '@/common/components/ReasonLabel';
import { useToast } from '@/common/contexts/ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReturnStatusFilter = 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('vi-VN'); } catch { return String(iso); }
};

const formatMoneyVND = (value: string | number | null | undefined) => {
    const n = typeof value === 'string' ? Number(value) : value ?? 0;
    if (!Number.isFinite(n)) return String(value ?? '');
    return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
};

// getStatusLabel and statusTone defined below
const getStatusLabel = (s: string, t: (key: string, options?: any) => string) => {
    if (s === 'PENDING_APPROVAL') return t('status.PENDING_APPROVAL');
    if (s === 'APPROVED') return t('status.APPROVED');
    if (s === 'REJECTED') return t('status.REJECTED');
    if (s === 'COMPLETED') return t('status.COMPLETED');
    return s;
};

const getStatusBadgeTone = (s: string) => {
    if (s === 'PENDING_APPROVAL') return 'warning' as const;
    if (s === 'APPROVED') return 'info' as const;
    if (s === 'REJECTED') return 'danger' as const;
    if (s === 'COMPLETED') return 'success' as const;
    return 'default' as const;
};

// ─── ReviewModal ──────────────────────────────────────────────────────────────

interface ReviewModalProps {
    item: OrderReturn;
    onClose: () => void;
    onAction: (returnId: number, action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND', note?: string) => Promise<void>;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ item, onClose, onAction }) => {
    const { t: _t } = useTranslation('returns');
    const t = _t as (key: string, options?: any) => string;
    const [rejectNote, setRejectNote] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);
    const [isLightboxVisible, setIsLightboxVisible] = useState(false);

    useEffect(() => {
        if (!lightboxImg) {
            setIsLightboxVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsLightboxVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [lightboxImg]);

    const handleAction = async (action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND') => {
        if (action === 'REJECT' && !rejectNote.trim()) {
            setToast(t('modal.rejectRequired'));
            return;
        }
        setProcessing(true);
        try {
            await onAction(item.returnId, action, action === 'REJECT' ? rejectNote.trim() : undefined);
        } finally {
            setProcessing(false);
        }
    };

    const isTerminal = item.status === 'COMPLETED' || item.status === 'REJECTED';

    return (
        <>
            <AdminModalShell
                icon={ClipboardList}
                title={t('modal.title')}
                subtitle={t('modal.orderInfo', { orderNumber: item.order?.orderNumber, customer: item.user?.fullName ?? t('table.guest') })}
                onClose={onClose}
                maxWidthClassName="max-w-2xl"
                panelClassName="max-h-[90vh] rounded-2xl"
                bodyClassName="max-h-[68vh] overflow-y-auto p-6 space-y-6"
                footer={!isTerminal ? (
                    !showRejectForm ? (
                        <div className="flex flex-wrap gap-3">
                            <AdminActionButton
                                onClick={() => setShowRejectForm(true)}
                                disabled={processing}
                                tone="danger"
                                size="md"
                                className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                            >
                                {t('modal.actionReject')}
                            </AdminActionButton>
                            {item.status !== 'APPROVED' && (
                                <AdminActionButton
                                    onClick={() => handleAction('APPROVE')}
                                    disabled={processing}
                                    tone="info"
                                    size="md"
                                    className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                                >
                                    {t('modal.actionApprove')}
                                </AdminActionButton>
                            )}
                            <AdminActionButton
                                onClick={() => handleAction('COMPLETE_REFUND')}
                                disabled={processing}
                                tone="success"
                                size="md"
                                className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                            >
                                {processing ? t('modal.processing') : t('modal.actionRefund')}
                            </AdminActionButton>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <AdminSecondaryButton
                                onClick={() => setShowRejectForm(false)}
                                className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                            >{t('modal.actionCancelReject')}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                onClick={() => handleAction('REJECT')}
                                disabled={processing || !rejectNote.trim()}
                                className="flex-1 bg-red-600 px-4 py-3 text-xs font-bold uppercase tracking-widest shadow-none hover:bg-red-700"
                            >{processing ? t('modal.processing') : t('modal.actionConfirmReject')}
                            </AdminPrimaryButton>
                        </div>
                    )
                ) : undefined}
            >

                        {/* Status + Info row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded p-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('modal.requestDate')}</div>
                                <AdminBadge
                                    tone={getStatusBadgeTone(item.status)}
                                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                                >
                                    {getStatusLabel(item.status, t)}
                                </AdminBadge>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded p-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('modal.requestDate')}</div>
                                <div className="text-sm text-white">{formatDateTime(item.createdAt)}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded p-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('modal.customer')}</div>
                                <div className="text-sm text-white font-medium">{item.user?.fullName ?? '—'}</div>
                                <div className="text-xs text-white/40 mt-0.5">{item.user?.email ?? '—'}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded p-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('modal.orderValue')}</div>
                                <div className="text-sm text-white font-semibold">{item.order?.totalAmount ? formatMoneyVND(item.order.totalAmount) : '—'}</div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{t('modal.returnReason')}</div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded text-sm text-white/80 leading-relaxed">
                                <ReasonLabel reason={item.reason} />
                            </div>
                        </div>

                        {/* Proof Images */}
                        {item.proofImages.length > 0 && (
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                                    {t('modal.proofImages', { count: item.proofImages.length })}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {item.proofImages.map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setLightboxImg(url)}
                                            className="aspect-square rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors cursor-pointer group relative"
                                        >
                                            <img src={url} alt={`Minh chứng ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Admin note (if already processed) */}
                        {item.adminNote && (
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{t('modal.adminNote')}</div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded text-sm text-white/70 italic">
                                    {item.adminNote}
                                </div>
                            </div>
                        )}

                        {/* Reject form */}
                        {showRejectForm && !isTerminal && (
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                                    {t('modal.rejectReason')} <span className="text-primary">*</span>
                                </div>
                                <textarea
                                    value={rejectNote}
                                    onChange={e => setRejectNote(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder={t('modal.rejectPlaceholder')}
                                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded focus:outline-none focus:border-red-500/50 transition-colors placeholder-white/20 resize-none"
                                />
                            </div>
                        )}

                        {toast && (
                            <div className="p-3 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">{toast}</div>
                        )}
            </AdminModalShell>

            {/* Lightbox */}
            {lightboxImg && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Xem ảnh minh chứng"
                    className={`fixed inset-0 z-[300] flex cursor-pointer items-center justify-center bg-slate-900/60 p-4 transition-all duration-200 ease-out ${
                        isLightboxVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setLightboxImg(null)}
                >
                    <div
                        className={`rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-4 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
                            isLightboxVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                        }`}
                    >
                        <img src={lightboxImg} alt="Minh chứng" className="max-h-[84vh] max-w-[88vw] rounded-xl object-contain" />
                    </div>
                    <button
                        className="absolute right-6 top-6 rounded-full border border-white/10 bg-black/70 p-2 text-white/60 transition-colors duration-200 hover:text-white"
                        onClick={() => setLightboxImg(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

// STATUS_FILTERS now defined inside main component

export const Returns: React.FC = () => {
    const { t: _t } = useTranslation('returns');
    const t = _t as (key: string, options?: any) => string;
    const { showToast } = useToast();
    const STATUS_FILTERS: { label: string; value: ReturnStatusFilter }[] = [
        { label: t('filters.all'), value: 'ALL' },
        { label: t('filters.pending'), value: 'PENDING_APPROVAL' },
        { label: t('filters.approved'), value: 'APPROVED' },
        { label: t('filters.rejected'), value: 'REJECTED' },
        { label: t('filters.completed'), value: 'COMPLETED' },
    ];
    const [returns, setReturns] = useState<OrderReturn[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) setLoading(true);
        else setIsRefreshing(true);
        try {
            const data = await adminReturnService.list({ status: statusFilter, page, pageSize: 15 });
            if (requestIdRef.current !== requestId) return;
            setReturns(data.returns);
            setTotalPages(data.pagination.totalPages);
            hasLoadedRef.current = true;
        } catch (error) {
            if (requestIdRef.current !== requestId) return;
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            showToast({
                type: 'error',
                title: e?.message || t('feedback.loadError'),
            });
        } finally {
            if (requestIdRef.current !== requestId) return;
            if (isFirstLoad) setLoading(false);
            else setIsRefreshing(false);
        }
    }, [page, showToast, statusFilter, t]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (
        returnId: number,
        action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
        note?: string,
    ) => {
        try {
            const result = await adminReturnService.process(returnId, action, note);
            const message = result.messageKey ? t(result.messageKey) : result.message;
            showToast({
                type: 'success',
                title: message,
            });
            setSelectedReturn(null);
            await load();
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            showToast({
                type: 'error',
                title: e?.message || t('feedback.processError'),
            });
        }
    };

    const pendingCount = useMemo(() => returns.filter(r => r.status === 'PENDING_APPROVAL').length, [returns]);
    const statusTabs = STATUS_FILTERS.map((filter) => ({
        key: filter.value,
        label: filter.label,
        count: filter.value === 'ALL'
            ? returns.length
            : returns.filter((item) => item.status === filter.value).length,
    }));

    const pageControls = (
        <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
            <AdminPageHeader
                icon={ClipboardList}
                title={t('page.title')}
                subtitle={t('page.subtitle')}
                actions={pendingCount > 0 ? (
                    <AdminBadge tone="warning" dot className="px-3 py-2 text-xs uppercase tracking-[0.14em]">
                        {t('page.pendingBadge', { count: pendingCount })}
                    </AdminBadge>
                ) : undefined}
            />

            <AdminTabs
                items={statusTabs}
                activeKey={statusFilter}
                onChange={(key) => {
                    setStatusFilter(key as ReturnStatusFilter);
                    setPage(1);
                }}
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
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-white/5 rounded" />
                        ))}
                    </div>
                ) : returns.length === 0 ? (
                    <AdminEmptyState
                        icon={ClipboardList}
                        title={t('table.empty')}
                        description={t('page.subtitle')}
                    />
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t('table.rowNumber')}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t('table.orderCustomer')}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30 hidden md:block">{t('table.reason')}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t('table.requestDate')}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t('table.status')}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t('table.actions')}</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-white/[0.03]">
                            {returns.map((ret, idx) => (
                                <div
                                    key={ret.returnId}
                                    className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="text-xs text-white/30 font-mono w-8">{(page - 1) * 15 + idx + 1}</div>

                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white font-mono">
                                            #{ret.order?.orderNumber ?? `RET-${ret.returnId}`}
                                        </div>
                                        <div className="text-xs text-white/50 mt-1 truncate">
                                            {ret.user?.fullName ?? t('table.guest')}
                                        </div>
                                        <div className="text-[10px] text-white/30 mt-0.5">
                                            {ret.user?.email ?? '—'}
                                        </div>
                                    </div>

                                    <div className="hidden md:block min-w-0">
                                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed"><ReasonLabel reason={ret.reason} /></p>
                                        {ret.proofImages.length > 0 && (
                                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-white/30">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {ret.proofImages.length} ảnh
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-white/50 whitespace-nowrap">{formatDateTime(ret.createdAt)}</div>

                                    <div>
                                        <AdminBadge
                                            tone={getStatusBadgeTone(ret.status)}
                                            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                                        >
                                            {getStatusLabel(ret.status, t)}
                                        </AdminBadge>
                                    </div>

                                    <div>
                                        <AdminActionButton
                                            onClick={() => setSelectedReturn(ret)}
                                            className="cursor-pointer whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            {t('table.viewDetail')}
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
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            size="md"
                            className="cursor-pointer text-xs font-bold uppercase tracking-widest"
                        >
                            {t('pagination.previous')}
                        </AdminActionButton>
                        <span className="text-xs text-white/40 px-3">
                            {t('pagination.page', { page, total: totalPages })}
                        </span>
                        <AdminActionButton
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            size="md"
                            className="cursor-pointer text-xs font-bold uppercase tracking-widest"
                        >
                            {t('pagination.next')}
                        </AdminActionButton>
                    </div>
                )}
            </AdminSectionCard>

            {/* Review Modal */}
            {selectedReturn && (
                <ReviewModal
                    item={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                    onAction={handleAction}
                />
            )}
        </AdminPageShell>
    );
};
