import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Search, X } from 'lucide-react';
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
    getAdminRefundStatusBadgeTone,
    getAdminRefundStatusLabel,
    getAdminReturnStatusBadgeTone,
    getAdminReturnStatusLabel,
} from '@/admin/utils/returns.utils';
import { ReasonLabel } from '@/common/components/ReasonLabel';
import { ReturnItemList } from '@/store/components/return-detail/ReturnItemList';
import type { AdminReturnReviewActions } from '@/admin/services/types';
import type { OrderReturn } from '@/common/services/return.types';
import { adminReturnReviewService } from '@/admin/services';
import { normalizeRefundTransactionStatus } from '@/common/services/return.refund-status';
import { getRefundTransactionMethodLabel } from '@/common/services/return.refund-transaction';
import {
    resolveExpectedRefundEconomics,
    summarizeReturnItemEconomics,
} from '@/common/utils/returnEconomics';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';
import { refundUi } from '@/common/styles/refundUi';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

type PendingNoteAction = 'reject' | 'refundFailed' | 'refundManualReview';

export interface AdminReturnReviewModalProps {
    actions: AdminReturnReviewActions;
    canManageFinanceActions?: boolean;
    item: OrderReturn;
    onClose: () => void;
}

export const AdminReturnReviewModal: React.FC<AdminReturnReviewModalProps> = ({
    actions,
    canManageFinanceActions = true,
    item,
    onClose,
}) => {
    const { t: rawT } = useTranslation('returns');
    const t = rawT as typeof rawT;
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const [actionNote, setActionNote] = useState('');
    const [pendingNoteAction, setPendingNoteAction] = useState<PendingNoteAction | null>(null);
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
                const detailed = await adminReturnReviewService.detail(item.returnId);
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
    }, [
        item.returnId,
        item.updatedAt,
        item.workflowStatus,
        item.refundStatus,
        item.financeNote,
    ]);

    useEffect(() => {
        if (!lightboxImg) {
            setIsLightboxVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsLightboxVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [lightboxImg]);

    const activeItem = detailItem ?? item;
    const translatedFinanceNote = translateLegacyReturnCopy(activeItem.financeNote, resolveText);
    const translatedAdminNote = translateLegacyReturnCopy(activeItem.adminNote, resolveText);
    const workflowStatus = canonicalizeWorkflowStatusFallback(activeItem.workflowStatus ?? activeItem.status);
    const activeRefundStatus = activeItem.refundStatus ?? 'NOT_APPLICABLE';
    const isRefundLocked = activeRefundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
    const isTerminal = ['REJECTED', 'CLOSED', 'REFUNDED'].includes(workflowStatus);
    const canReject = ['REQUESTED', 'PENDING_ADMIN_REVIEW', 'SUBMITTED', 'PENDING_PAYMENT_CONFIRMATION'].includes(workflowStatus);
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
    const expectedRefundLabel = resolveText('detail.infoExpectedRefund', 'Hoàn tiền dự kiến');
    const expectedRefundHintLabel = resolveText(
        'detail.infoExpectedRefundHint',
        'Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.',
    );
    const transactionsTitle = resolveText('detail.transactionsTitle', 'Giao dịch hoàn tiền');
    const refundStatusLabel = resolveText('modal.refundStatus', 'Trạng thái hoàn tiền');
    const financeNoteLabel = resolveText('modal.financeNote', 'Ghi chú tài chính');
    const financeNoteMetaLabel = resolveText('modal.financeNoteMeta', 'Cập nhật {{date}} · {{actor}}', {
        date: activeItem.financeNoteUpdatedAt ? formatAdminReturnDateTime(activeItem.financeNoteUpdatedAt) : '—',
        actor: activeItem.financeNoteUpdatedBy?.fullName ?? '—',
    });
    const returnReasonLabel = resolveText('modal.returnReason', 'Lý do trả hàng');
    const itemsTitle = resolveText('detail.itemsTitle', 'Sản phẩm trả');
    const grossTotalLabel = resolveText('itemsTable.grossTotalLabel', 'Tổng giá gốc');
    const discountTotalLabel = resolveText('itemsTable.discountTotalLabel', 'Tổng giảm giá phân bổ');
    const netPaidTotalLabel = resolveText('itemsTable.netPaidTotalLabel', 'Tổng thực trả');
    const proofImagesLabel = resolveText('modal.proofImages', 'Ảnh minh chứng ({{count}})', {
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
    const financeNoteRequiredLabel = resolveText('modal.financeNoteRequired', 'Vui lòng nhập ghi chú xử lý hoàn tiền.');
    const refundFailedReasonLabel = resolveText('modal.refundFailedReason', 'Lý do hoàn tiền lỗi');
    const refundManualReviewReasonLabel = resolveText('modal.refundManualReviewReason', 'Lý do kiểm tra thủ công');
    const refundFailedPlaceholderLabel = resolveText(
        'modal.refundFailedPlaceholder',
        'Nhập lý do hoàn tiền lỗi...',
    );
    const refundManualReviewPlaceholderLabel = resolveText(
        'modal.refundManualReviewPlaceholder',
        'Nhập lý do cần kiểm tra thủ công...',
    );
    const actionRejectLabel = resolveText('modal.actionReject', 'Từ chối yêu cầu');
    const actionApproveLabel = resolveText('modal.actionApprove', 'Duyệt yêu cầu');
    const actionMarkInTransitLabel = resolveText('modal.actionMarkInTransit', 'Đánh dấu đang hoàn về kho');
    const actionMarkReceivedLabel = resolveText('modal.actionMarkReceived', 'Xác nhận đã nhận hàng hoàn');
    const actionAcceptForRefundLabel = resolveText('modal.actionAcceptForRefund', 'Chấp nhận hoàn tiền');
    const actionRefundPendingLabel = resolveText('modal.actionRefundPending', 'Đặt lại chờ hoàn tiền');
    const actionRefundProcessingLabel = resolveText('modal.actionRefundProcessing', 'Đánh dấu đang hoàn tiền');
    const actionRefundFailedLabel = resolveText('modal.actionRefundFailed', 'Đánh dấu hoàn tiền lỗi');
    const actionRefundManualReviewLabel = resolveText('modal.actionRefundManualReview', 'Chuyển kiểm tra thủ công');
    const actionContinueRefundLabel = resolveText('modal.actionContinueRefund', 'Tiếp tục tới hoàn tiền');
    const actionConfirmRejectLabel = resolveText('modal.actionConfirmReject', 'Xác nhận từ chối');
    const actionConfirmRefundNoteLabel = resolveText('modal.actionConfirmRefundNote', 'Xác nhận cập nhật');
    const actionCancelRejectLabel = resolveText('modal.actionCancelReject', 'Hủy');
    const closeModalLabel = resolveText('modal.actionClose', 'Đóng');
    const processingLabel = resolveText('modal.processing', 'Đang xử lý...');
    const refundLockedLabel = resolveText(
        'modal.refundLocked',
        'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.',
    );
    const refundLockedHintLabel = resolveText(
        'modal.refundLockedHint',
        'Đang chờ khách xác nhận đã nhận hàng để hệ thống mở khóa bước hoàn tiền.',
    );
    const financeActionRestrictedLabel = resolveText(
        'modal.financeActionRestricted',
        'Bước hoàn tiền đang chờ bộ phận tài chính xử lý.',
    );
    const primaryAction = !isRefundLocked
        ? (() => {
            if (['REQUESTED', 'PENDING_ADMIN_REVIEW', 'SUBMITTED'].includes(workflowStatus)) {
                return { label: actionApproveLabel, onClick: actions.approve, tone: 'info' as const };
            }
            if (workflowStatus === 'APPROVED') {
                return { label: actionMarkInTransitLabel, onClick: actions.markInTransit, tone: 'info' as const };
            }
            if (workflowStatus === 'IN_RETURN_TRANSIT') {
                return { label: actionMarkReceivedLabel, onClick: actions.markReceived, tone: 'info' as const };
            }
            if (workflowStatus === 'RECEIVED' || workflowStatus === 'RECEIVED_AND_INSPECTING') {
                return { label: actionAcceptForRefundLabel, onClick: actions.acceptForRefund, tone: 'info' as const };
            }
            if (workflowStatus === 'ACCEPTED_FOR_REFUND' && canManageFinanceActions) {
                return { label: actionContinueRefundLabel, onClick: actions.refund, tone: 'success' as const };
            }
            return null;
        })()
        : null;
    const refundManagementActions = workflowStatus === 'ACCEPTED_FOR_REFUND' && !isRefundLocked && canManageFinanceActions
        ? [
            {
                key: 'refundPending' as const,
                label: actionRefundPendingLabel,
                onClick: actions.setRefundPending,
                tone: 'info' as const,
            },
            {
                key: 'refundProcessing' as const,
                label: actionRefundProcessingLabel,
                onClick: actions.setRefundProcessing,
                tone: 'info' as const,
            },
            {
                key: 'refundFailed' as const,
                label: actionRefundFailedLabel,
                onClick: actions.setRefundFailed,
                tone: 'danger' as const,
                noteAction: 'refundFailed' as const,
            },
            {
                key: 'refundManualReview' as const,
                label: actionRefundManualReviewLabel,
                onClick: actions.setRefundManualReview,
                tone: 'warning' as const,
                noteAction: 'refundManualReview' as const,
            },
        ]
        : [];
    const hasPrimaryActions = canReject || Boolean(primaryAction);
    const isNoteFormVisible = pendingNoteAction !== null;
    const { expectedRefundAmount, legacyTotalRefundAmount, showsRefundCapAdjustment } =
        resolveExpectedRefundEconomics(activeItem);
    const itemEconomicsSummary = summarizeReturnItemEconomics(activeItem.items);
    const noteFormConfig = pendingNoteAction === 'reject'
        ? {
            emptyMessage: rejectRequiredLabel,
            submit: actions.reject,
            title: rejectReasonLabel,
            placeholder: rejectPlaceholderLabel,
            confirmLabel: actionConfirmRejectLabel,
        }
        : pendingNoteAction === 'refundFailed'
            ? {
                emptyMessage: financeNoteRequiredLabel,
                submit: actions.setRefundFailed,
                title: refundFailedReasonLabel,
                placeholder: refundFailedPlaceholderLabel,
                confirmLabel: actionConfirmRefundNoteLabel,
            }
            : pendingNoteAction === 'refundManualReview'
                ? {
                    emptyMessage: financeNoteRequiredLabel,
                    submit: actions.setRefundManualReview,
                    title: refundManualReviewReasonLabel,
                    placeholder: refundManualReviewPlaceholderLabel,
                    confirmLabel: actionConfirmRefundNoteLabel,
                }
                : null;
    const statusTranslator = (key: string, options?: Record<string, unknown>) => {
        const fallbackByKey: Record<string, string> = {
            'status.SUBMITTED': 'Chờ duyệt',
            'status.REQUESTED': 'Chờ duyệt',
            'status.PENDING_PAYMENT_CONFIRMATION': 'Chờ xác nhận thanh toán',
            'status.PENDING_ADMIN_REVIEW': 'Chờ duyệt',
            'status.APPROVED': 'Đã duyệt',
            'status.IN_RETURN_TRANSIT': 'Đang hoàn về kho',
            'status.REJECTED': 'Đã từ chối',
            'status.RECEIVED': 'Đã nhận hàng',
            'status.RECEIVED_AND_INSPECTING': 'Đã nhận và đang kiểm tra',
            'status.ACCEPTED_FOR_REFUND': 'Đã chấp nhận hoàn tiền',
            'status.CLOSED': 'Đã đóng',
            'status.REFUNDED': 'Đã hoàn tiền',
        };
        return resolveText(key, fallbackByKey[key] ?? key, options);
    };
    const getRefundTransactionStatusLabel = (status: string) => {
        const normalizedStatus = normalizeRefundTransactionStatus(status);
        const fallbackByStatus: Record<string, string> = {
            COMPLETED: 'Hoàn tiền thành công',
            SUCCESS: 'Hoàn tiền thành công',
            PENDING: 'Chờ hoàn tiền',
            PROCESSING: 'Đang hoàn tiền',
            FAILED: 'Hoàn tiền thất bại',
        };

        return resolveText(
            `detail.transactionStatus.${normalizedStatus}`,
            fallbackByStatus[normalizedStatus] ?? normalizedStatus,
        );
    };

    const getRefundTransactionToneClasses = (status: string) => {
        const normalizedStatus = normalizeRefundTransactionStatus(status);

        switch (normalizedStatus) {
            case 'COMPLETED':
            case 'SUCCESS':
                return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
            case 'FAILED':
                return 'border-red-400/20 bg-red-400/10 text-red-100';
            case 'PENDING':
            case 'PROCESSING':
                return 'border-amber-400/20 bg-amber-400/10 text-amber-100';
            default:
                return 'border-white/10 bg-white/5 text-white/80';
        }
    };

    const openNoteAction = (action: PendingNoteAction) => {
        setPendingNoteAction(action);
        setActionNote('');
        setToast(null);
    };

    const submitPendingNoteAction = async (noteOverride?: string) => {
        const trimmedNote = noteOverride?.trim();
        if (!noteFormConfig || !trimmedNote) {
            setToast(noteFormConfig?.emptyMessage ?? financeNoteRequiredLabel);
            return;
        }

        setProcessing(true);
        try {
            await noteFormConfig.submit(activeItem.returnId, trimmedNote);
            setPendingNoteAction(null);
            setActionNote('');
            setToast(null);
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
                maxWidthClassName="max-w-5xl"
                panelClassName="max-h-[90vh] rounded-2xl"
                bodyClassName="max-h-[68vh] overflow-y-auto p-6 space-y-6"
                footer={!isTerminal && (isNoteFormVisible || hasPrimaryActions || refundManagementActions.length > 0) ? (
                    !isNoteFormVisible ? (
                        <div className="space-y-3">
                            {refundManagementActions.length > 0 && (
                                <div className="space-y-2">
                                    <div className={refundUi.eyeBrow}>
                                        {transactionsTitle}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                    {refundManagementActions.map((refundAction) => (
                                        <AdminActionButton
                                            key={refundAction.key}
                                            onClick={() => {
                                                if (refundAction.noteAction) {
                                                    openNoteAction(refundAction.noteAction);
                                                    return;
                                                }
                                                void refundAction.onClick(activeItem.returnId);
                                            }}
                                            disabled={processing}
                                            tone={refundAction.tone}
                                            size="md"
                                            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                        >
                                            {processing ? processingLabel : refundAction.label}
                                        </AdminActionButton>
                                    ))}
                                </div>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3">
                                <AdminSecondaryButton
                                    onClick={onClose}
                                    className="px-4 py-3 text-xs font-semibold"
                                >
                                    {closeModalLabel}
                                </AdminSecondaryButton>
                                {canReject && (
                                    <AdminActionButton
                                        onClick={() => openNoteAction('reject')}
                                        disabled={processing}
                                        tone="danger"
                                        size="md"
                                        className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                    >
                                        {actionRejectLabel}
                                    </AdminActionButton>
                                )}
                                {primaryAction && (
                                    <AdminActionButton
                                        onClick={() => primaryAction.onClick(activeItem.returnId)}
                                        disabled={processing}
                                        tone={primaryAction.tone}
                                        size="md"
                                        className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                    >
                                        {processing ? processingLabel : primaryAction.label}
                                    </AdminActionButton>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {noteFormConfig && (
                                <div className="space-y-2">
                                    <div className={refundUi.eyeBrow}>
                                        {noteFormConfig.title}
                                    </div>
                                    <textarea
                                        value={actionNote}
                                        onChange={(event) => setActionNote(event.target.value)}
                                        placeholder={noteFormConfig.placeholder}
                                        className="min-h-28 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                    />
                                </div>
                            )}
                            <div className="flex gap-3">
                                <AdminSecondaryButton
                                    onClick={() => {
                                        setPendingNoteAction(null);
                                        setActionNote('');
                                    }}
                                    className="px-4 py-3 text-xs font-semibold"
                                >
                                    {actionCancelRejectLabel}
                                </AdminSecondaryButton>
                                <AdminSecondaryButton
                                    onClick={onClose}
                                    className="px-4 py-3 text-xs font-semibold"
                                >
                                    {closeModalLabel}
                                </AdminSecondaryButton>
                                <AdminActionButton
                                    onClick={() => void submitPendingNoteAction(actionNote)}
                                    disabled={processing || !actionNote.trim()}
                                    tone="danger"
                                    size="md"
                                    className="flex-1 px-4 py-3 text-xs font-semibold"
                                >
                                    {processing ? processingLabel : noteFormConfig?.confirmLabel ?? actionConfirmRejectLabel}
                                </AdminActionButton>
                            </div>
                        </div>
                    )
                ) : undefined}
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={`${refundUi.sectionMuted} p-5`}>
                        <div className={`${refundUi.eyeBrow} mb-1`}>
                            {statusLabel}
                        </div>
                        <AdminBadge
                            tone={getAdminReturnStatusBadgeTone(activeItem.workflowStatus ?? activeItem.status)}
                            className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                        >
                            {getAdminReturnStatusLabel(activeItem.workflowStatus ?? activeItem.status, statusTranslator)}
                        </AdminBadge>
                    </div>
                    <div className={`${refundUi.sectionMuted} p-5`}>
                        <div className={`${refundUi.eyeBrow} mb-1`}>
                            {requestDateLabel}
                        </div>
                        <div className="text-sm text-white">
                            {formatAdminReturnDateTime(activeItem.createdAt)}
                        </div>
                    </div>
                    <div className={`${refundUi.sectionMuted} p-5`}>
                        <div className={`${refundUi.eyeBrow} mb-1`}>
                            {customerLabel}
                        </div>
                        <div className="text-sm text-white font-medium">
                            {activeItem.user?.fullName ?? '—'}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                            {activeItem.user?.email ?? '—'}
                        </div>
                    </div>
                    <div className={`${refundUi.sectionMuted} p-5`}>
                        <div className={`${refundUi.eyeBrow} mb-1`}>
                            {orderValueLabel}
                        </div>
                        <div className="text-sm text-white font-semibold">
                            {activeItem.order?.totalAmount
                                ? formatAdminReturnMoneyVND(activeItem.order.totalAmount)
                                : '—'}
                        </div>
                    </div>
                    <div className={`${refundUi.success} p-5`}>
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
                    <div className={`${refundUi.sectionMuted} p-5`}>
                        <div className={`${refundUi.eyeBrow} mb-1`}>
                            {refundStatusLabel}
                        </div>
                        <AdminBadge
                            tone={getAdminRefundStatusBadgeTone(activeRefundStatus)}
                            className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                        >
                            {getAdminRefundStatusLabel(activeRefundStatus, statusTranslator)}
                        </AdminBadge>
                    </div>
                </div>

                {isRefundLocked && (
                <div className={`${refundUi.warning} p-4 text-sm text-amber-100`}>
                        <div>{refundLockedLabel}</div>
                        <div className="mt-2 text-xs text-amber-100/80">{refundLockedHintLabel}</div>
                    </div>
                )}

                {workflowStatus === 'ACCEPTED_FOR_REFUND' && !isRefundLocked && !canManageFinanceActions && (
                    <div className={`${refundUi.info} p-4 text-sm text-sky-100`}>
                        {financeActionRestrictedLabel}
                    </div>
                )}

                <div>
                    <div className={`${refundUi.eyeBrow} mb-2`}>
                        {returnReasonLabel}
                    </div>
                    <div className={`${refundUi.sectionMuted} p-4 text-sm text-white/80 leading-relaxed`}>
                        <ReasonLabel reason={activeItem.reason} />
                    </div>
                </div>

                {Array.isArray(activeItem.items) && activeItem.items.length > 0 && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {itemsTitle}
                        </div>
                        <ReturnItemList items={activeItem.items} />
                    </div>
                )}

                {activeItem.proofImages.length > 0 && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {proofImagesLabel}
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                            {activeItem.proofImages.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => setLightboxImg(url)}
                                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/30 cursor-pointer"
                                >
                                    <img
                                        src={url}
                                        alt={proofImageAlt(index + 1)}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <Search className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeItem.financeNote && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {financeNoteLabel}
                        </div>
                        <div className={`${refundUi.warning} p-4 text-sm text-amber-100`}>
                            <div>{translatedFinanceNote ?? activeItem.financeNote}</div>
                            {(activeItem.financeNoteUpdatedAt || activeItem.financeNoteUpdatedBy?.fullName) && (
                                <div className="mt-2 text-[11px] text-amber-100/70">
                                    {financeNoteMetaLabel}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {Array.isArray(activeItem.refundTransactions) && activeItem.refundTransactions.length > 0 && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {transactionsTitle}
                        </div>
                        <div className="space-y-3">
                            {activeItem.refundTransactions.map((transaction, index) => (
                                <div
                                    key={transaction.transactionId ?? transaction.refundTransactionId ?? `${transaction.method}-${transaction.status}-${index}`}
                                    className={`rounded-xl border p-4 ${getRefundTransactionToneClasses(transaction.status)}`}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="font-semibold">
                                                {formatAdminReturnMoneyVND(transaction.amount)}
                                            </div>
                                            <div className="mt-0.5 text-xs opacity-80">
                                                {getRefundTransactionMethodLabel(transaction.method, resolveText)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-medium">
                                                {getRefundTransactionStatusLabel(transaction.status)}
                                            </div>
                                            {transaction.transactionRef && (
                                                <div className="mt-0.5 text-xs opacity-70">{transaction.transactionRef}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeItem.adminNote && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {adminNoteLabel}
                        </div>
                        <div className={`${refundUi.sectionMuted} p-4 text-sm text-white/70 italic`}>
                            {translatedAdminNote ?? activeItem.adminNote}
                        </div>
                    </div>
                )}

                {isDetailLoading && (
                    <div className="rounded border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
                        {processingLabel}
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
                        <X className="h-8 w-8" />
                    </button>
                </div>
            )}
        </>
    );
};
