import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react';
import {
    AdminActionButton,
    AdminBadge,
    AdminModalShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';
import {
    formatAdminReturnDateTime,
    formatAdminReturnMoneyVND,
    getAdminReturnStatusBadgeTone,
    getAdminReturnStatusLabel,
} from '@/admin/utils/adminReturn.utils';
import { AdminReturnAction } from '@/admin/hooks/useAdminReturns';
import { ReasonLabel } from '@/common/components/ReasonLabel';
import { adminReturnService, OrderReturn } from '@/common/services/return.service';
import { normalizeReturnStatus } from '@/common/utils/returnStatus';

export interface AdminReturnReviewModalProps {
    item: OrderReturn;
    onClose: () => void;
    onAction: (returnId: number, action: AdminReturnAction, note?: string) => Promise<void>;
}

export const AdminReturnReviewModal: React.FC<AdminReturnReviewModalProps> = ({
    item,
    onClose,
    onAction,
}) => {
    const { t: rawT } = useTranslation('returns');
    const t = rawT as typeof rawT;
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const [rejectNote, setRejectNote] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);
    const [isLightboxVisible, setIsLightboxVisible] = useState(false);
    const [detailItem, setDetailItem] = useState<OrderReturn | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const hydrateReturnDetail = async () => {
            setIsDetailLoading(true);

            try {
                const detailed = await adminReturnService.detail(item.returnId);
                if (!cancelled) {
                    setDetailItem(detailed);
                }
            } catch {
                if (!cancelled) {
                    setDetailItem(null);
                }
            } finally {
                if (!cancelled) {
                    setIsDetailLoading(false);
                }
            }
        };

        void hydrateReturnDetail();

        return () => {
            cancelled = true;
        };
    }, [item.returnId]);

    useEffect(() => {
        if (!lightboxImg) {
            setIsLightboxVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsLightboxVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [lightboxImg]);

    const activeItem = detailItem ?? item;
    const normalizedStatus = normalizeReturnStatus(activeItem.status);
    const isTerminal =
        normalizedStatus === 'REFUNDED' ||
        normalizedStatus === 'REJECTED';
    const guestLabel = resolveText('table.guest', 'Khách vãng lai');
    const titleLabel = resolveText('modal.title', 'Xem xét yêu cầu trả hàng');
    const orderInfoLabel = resolveText('modal.orderInfo', 'Đơn hàng #{{orderNumber}} - {{customer}}', {
        orderNumber: activeItem.order?.orderNumber,
        customer: activeItem.user?.fullName ?? guestLabel,
    });
    const statusLabel = resolveText('modal.status', 'Trạng thái');
    const customerLabel = resolveText('modal.customer', 'Khách hàng');
    const requestDateLabel = resolveText('modal.requestDate', 'Ngày yêu cầu');
    const orderValueLabel = resolveText('modal.orderValue', 'Giá trị đơn');
    const returnReasonLabel = resolveText('modal.returnReason', 'Lý do trả hàng');
    const proofImagesLabel = resolveText('modal.proofImages', 'Hình ảnh minh chứng ({{count}})', {
        count: activeItem.proofImages.length,
    });
    const proofImageAlt = (index?: number) =>
        resolveText(
            index ? 'modal.proofImageAltNumber' : 'modal.proofImageAlt',
            index ? 'Minh chứng {{index}}' : 'Minh chứng',
            index ? { index } : undefined,
        );
    const proofLightboxLabel = resolveText('modal.proofLightboxLabel', 'Xem ảnh minh chứng');
    const closeProofLightboxLabel = resolveText('modal.closeProofLightbox', 'Đóng ảnh minh chứng');
    const adminNoteLabel = resolveText('modal.adminNote', 'Ghi chú xử lý');
    const rejectRequiredLabel = resolveText('modal.rejectRequired', 'Vui lòng nhập lý do từ chối.');
    const rejectReasonLabel = resolveText('modal.rejectReason', 'Lý do từ chối');
    const rejectPlaceholderLabel = resolveText(
        'modal.rejectPlaceholder',
        'Nhập lý do từ chối yêu cầu trả hàng...',
    );
    const actionRejectLabel = resolveText('modal.actionReject', 'Từ chối yêu cầu');
    const actionApproveLabel = resolveText('modal.actionApprove', 'Duyệt yêu cầu');
    const actionRefundLabel = resolveText('modal.actionRefund', 'Chấp nhận & Hoàn tiền');
    const actionConfirmRejectLabel = resolveText('modal.actionConfirmReject', 'Xác nhận từ chối');
    const actionCancelRejectLabel = resolveText('modal.actionCancelReject', 'Hủy');
    const processingLabel = resolveText('modal.processing', 'Đang xử lý...');
    const statusTranslator = (key: string, options?: Record<string, unknown>) => {
        const fallbackByKey: Record<string, string> = {
            'status.REQUESTED': 'Chờ duyệt',
            'status.APPROVED': 'Đã duyệt',
            'status.REJECTED': 'Đã từ chối',
            'status.RECEIVED': 'Đã nhận hàng',
            'status.REFUNDED': 'Đã hoàn tiền',
        };
        return resolveText(key, fallbackByKey[key] ?? key, options);
    };

    const handleAction = async (action: AdminReturnAction) => {
        if (action === 'REJECT' && !rejectNote.trim()) {
            setToast(rejectRequiredLabel);
            return;
        }

        setProcessing(true);
        try {
            await onAction(activeItem.returnId, action, action === 'REJECT' ? rejectNote.trim() : undefined);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <AdminModalShell
                icon={ClipboardList}
                title={titleLabel}
                subtitle={orderInfoLabel}
                onClose={onClose}
                maxWidthClassName="max-w-2xl"
                panelClassName="max-h-[90vh] rounded-2xl"
                bodyClassName="max-h-[68vh] overflow-y-auto p-6 space-y-6"
                footer={!isTerminal ? (
                    !showRejectForm ? (
                        <div className="flex flex-wrap gap-3">
                            {normalizedStatus === 'REQUESTED' && (
                                <AdminActionButton
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={processing}
                                    tone="danger"
                                    size="md"
                                    className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                                >
                                    {actionRejectLabel}
                                </AdminActionButton>
                            )}
                            {normalizedStatus === 'REQUESTED' && (
                                <AdminActionButton
                                    onClick={() => handleAction('APPROVE')}
                                    disabled={processing}
                                    tone="info"
                                    size="md"
                                    className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                                >
                                    {actionApproveLabel}
                                </AdminActionButton>
                            )}
                            <AdminActionButton
                                onClick={() => handleAction('COMPLETE_REFUND')}
                                disabled={processing}
                                tone="success"
                                size="md"
                                className="flex-1 cursor-pointer py-3 text-xs font-bold uppercase tracking-widest"
                            >
                                {processing ? processingLabel : actionRefundLabel}
                            </AdminActionButton>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <AdminSecondaryButton
                                onClick={() => setShowRejectForm(false)}
                                className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                            >
                                {actionCancelRejectLabel}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                onClick={() => handleAction('REJECT')}
                                disabled={processing || !rejectNote.trim()}
                                className="flex-1 bg-red-600 px-4 py-3 text-xs font-bold uppercase tracking-widest shadow-none hover:bg-red-700"
                            >
                                {processing ? processingLabel : actionConfirmRejectLabel}
                            </AdminPrimaryButton>
                        </div>
                    )
                ) : undefined}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {statusLabel}
                        </div>
                        <AdminBadge
                            tone={getAdminReturnStatusBadgeTone(activeItem.status)}
                            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                        >
                            {getAdminReturnStatusLabel(activeItem.status, statusTranslator)}
                        </AdminBadge>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {requestDateLabel}
                        </div>
                        <div className="text-sm text-white">
                            {formatAdminReturnDateTime(activeItem.createdAt)}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {customerLabel}
                        </div>
                        <div className="text-sm text-white font-medium">
                            {activeItem.user?.fullName ?? '—'}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                            {activeItem.user?.email ?? '—'}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {orderValueLabel}
                        </div>
                        <div className="text-sm text-white font-semibold">
                            {activeItem.order?.totalAmount
                                ? formatAdminReturnMoneyVND(activeItem.order.totalAmount)
                                : '—'}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                        {returnReasonLabel}
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded text-sm text-white/80 leading-relaxed">
                        <ReasonLabel reason={activeItem.reason} />
                    </div>
                </div>

                {activeItem.proofImages.length > 0 && (
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                            {proofImagesLabel}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {activeItem.proofImages.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => setLightboxImg(url)}
                                    className="aspect-square rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors cursor-pointer group relative"
                                >
                                    <img
                                        src={url}
                                        alt={proofImageAlt(index + 1)}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                            />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeItem.adminNote && (
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                            {adminNoteLabel}
                        </div>
                        <div className="p-4 bg-white/5 border border-white/5 rounded text-sm text-white/70 italic">
                            {activeItem.adminNote}
                        </div>
                    </div>
                )}

                {isDetailLoading && (
                    <div className="rounded border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
                        {processingLabel}
                    </div>
                )}

                {showRejectForm && !isTerminal && (
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                            {rejectReasonLabel} <span className="text-primary">*</span>
                        </div>
                        <textarea
                            value={rejectNote}
                            onChange={(event) => setRejectNote(event.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder={rejectPlaceholderLabel}
                            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded focus:outline-none focus:border-red-500/50 transition-colors placeholder-white/20 resize-none"
                        />
                    </div>
                )}

                {toast && (
                    <div className="p-3 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
                        {toast}
                    </div>
                )}
            </AdminModalShell>

            {lightboxImg && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={proofLightboxLabel}
                    className={`fixed inset-0 z-[300] flex cursor-pointer items-center justify-center bg-slate-900/60 p-4 transition-all duration-200 ease-out ${
                        isLightboxVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setLightboxImg(null)}
                >
                    <div
                        className={`rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-4 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
                            isLightboxVisible
                                ? 'translate-y-0 scale-100 opacity-100'
                                : 'translate-y-2 scale-95 opacity-0'
                        }`}
                    >
                        <img
                            src={lightboxImg}
                            alt={proofImageAlt()}
                            className="max-h-[84vh] max-w-[88vw] rounded-xl object-contain"
                        />
                    </div>
                    <button
                        aria-label={closeProofLightboxLabel}
                        className="absolute right-6 top-6 rounded-full border border-white/10 bg-black/70 p-2 text-white/60 transition-colors duration-200 hover:text-white"
                        onClick={() => setLightboxImg(null)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
};
