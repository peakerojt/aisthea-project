import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminReturnService, OrderReturn } from '../services/return.service';
import { ReasonLabel } from '../components/return/ReasonLabel';

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

const statusTone = (s: string) => {
    if (s === 'PENDING_APPROVAL') return 'border-amber-500/30 text-amber-200 bg-amber-500/10';
    if (s === 'APPROVED') return 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10';
    if (s === 'REJECTED') return 'border-red-500/30 text-red-200 bg-red-500/10';
    if (s === 'COMPLETED') return 'border-emerald-500/30 text-emerald-200 bg-emerald-500/10';
    return 'border-white/10 text-white/60 bg-white/5';
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
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <div
                    className="relative z-10 w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-sm shadow-2xl max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tighter text-white">
                                {t('modal.title')}
                            </h2>
                            <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">
                                {t('modal.orderInfo', { orderNumber: item.order?.orderNumber, customer: item.user?.fullName ?? t('table.guest') })}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 p-6 space-y-6">

                        {/* Status + Info row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded p-4">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{t('modal.requestDate')}</div>
                                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border inline-block ${statusTone(item.status)}`}>
                                    {getStatusLabel(item.status, t)}
                                </span>
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
                    </div>

                    {/* Footer Actions */}
                    {!isTerminal && (
                        <div className="flex flex-wrap gap-3 px-6 py-5 border-t border-white/5 shrink-0">
                            {!showRejectForm ? (
                                <>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                                    >{t('modal.actionReject')}
                                    </button>
                                    {item.status !== 'APPROVED' && (
                                        <button
                                            onClick={() => handleAction('APPROVE')}
                                            disabled={processing}
                                            className="flex-1 px-4 py-3 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                                        >{t('modal.actionApprove')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleAction('COMPLETE_REFUND')}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                                    >{processing ? t('modal.processing') : t('modal.actionRefund')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowRejectForm(false)}
                                        className="px-4 py-3 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                                    >{t('modal.actionCancelReject')}
                                    </button>
                                    <button
                                        onClick={() => handleAction('REJECT')}
                                        disabled={processing || !rejectNote.trim()}
                                        className="flex-1 px-4 py-3 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >{processing ? t('modal.processing') : t('modal.actionConfirmReject')}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 cursor-pointer"
                    onClick={() => setLightboxImg(null)}
                >
                    <img src={lightboxImg} alt="Minh chứng" className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl" />
                    <button
                        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
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

export const AdminReturns: React.FC = () => {
    const { t: _t } = useTranslation('returns');
    const t = _t as (key: string, options?: any) => string;
    const STATUS_FILTERS: { label: string; value: ReturnStatusFilter }[] = [
        { label: t('filters.all'), value: 'ALL' },
        { label: t('filters.pending'), value: 'PENDING_APPROVAL' },
        { label: t('filters.approved'), value: 'APPROVED' },
        { label: t('filters.rejected'), value: 'REJECTED' },
        { label: t('filters.completed'), value: 'COMPLETED' },
    ];
    const [returns, setReturns] = useState<OrderReturn[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminReturnService.list({ status: statusFilter, page, pageSize: 15 });
            setReturns(data.returns);
            setTotalPages(data.pagination.totalPages);
        } catch (e: any) {
            setToast({ type: 'error', message: e?.message || t('feedback.loadError') });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (
        returnId: number,
        action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
        note?: string,
    ) => {
        try {
            const result = await adminReturnService.process(returnId, action, note);
            const message = result.messageKey ? t(result.messageKey) : result.message;
            setToast({ type: 'success', message });
            setSelectedReturn(null);
            await load();
        } catch (e: any) {
            setToast({ type: 'error', message: e?.message || t('feedback.processError') });
        }
    };

    const pendingCount = useMemo(() => returns.filter(r => r.status === 'PENDING_APPROVAL').length, [returns]);

    return (
        <div className="p-6 md:p-8 min-h-screen bg-bg-dark text-white font-sans">
            {/* Page Header */}
            <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
                        {t('page.title')}
                    </h1>
                    <p className="text-white/40 text-xs uppercase tracking-widest mt-2">
                        {t('page.subtitle')}
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 border border-amber-500/30 bg-amber-500/10 rounded">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-200 text-xs font-bold uppercase tracking-widest">
                            {t('page.pendingBadge', { count: pendingCount })}
                        </span>
                    </div>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => { setStatusFilter(f.value); setPage(1); }}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer ${statusFilter === f.value
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-surface-dark border border-white/5 rounded-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3 animate-pulse">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-white/5 rounded" />
                        ))}
                    </div>
                ) : returns.length === 0 ? (
                    <div className="p-12 text-center text-white/40">
                        <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm">{t('table.empty')}</p>
                    </div>
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
                                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border whitespace-nowrap ${statusTone(ret.status)}`}>
                                            {getStatusLabel(ret.status, t)}
                                        </span>
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => setSelectedReturn(ret)}
                                            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
                                        >
                                            {t('table.viewDetail')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-4 py-2 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {t('pagination.previous')}
                    </button>
                    <span className="text-xs text-white/40 px-3">
                        {t('pagination.page', { page, total: totalPages })}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-4 py-2 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {t('pagination.next')}
                    </button>
                </div>
            )}

            {/* Review Modal */}
            {selectedReturn && (
                <ReviewModal
                    item={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                    onAction={handleAction}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md px-4">
                    <div className={`p-4 rounded-lg shadow-2xl border flex items-center gap-3 ${toast.type === 'success'
                        ? 'bg-emerald-500/90 border-emerald-400 text-white'
                        : 'bg-red-500/90 border-red-400 text-white'
                        }`}>
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {toast.type === 'success' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                        </svg>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
