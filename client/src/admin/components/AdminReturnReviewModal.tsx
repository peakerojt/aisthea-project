import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ClipboardList, ImagePlus, Landmark, Search, Trash2, X } from 'lucide-react';
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
import { getCloudinaryQrImage } from '@/common/utils/cloudinary';
import { fileToBase64 } from '@/common/utils/imageCompression';

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
    const [isCompleteRefundModalOpen, setIsCompleteRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundTransactionRef, setRefundTransactionRef] = useState('');
    const [refundFinanceNote, setRefundFinanceNote] = useState('');
    const [proofUploads, setProofUploads] = useState<Array<{ fileUrl: string; fileName?: string | null }>>([]);
    const [isUploadingProofs, setIsUploadingProofs] = useState(false);

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
    const refundProofTitle = resolveText('detail.refundProofTitle', 'Chứng từ hoàn tiền');
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
    const refundPayoutProofAlt = resolveText('detail.refundProofAlt', 'Ảnh chứng từ hoàn tiền');
    const refundPayoutProofOpenLabel = resolveText('detail.refundProofOpen', 'Mở ảnh chứng từ');
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
    const actionConfirmCompleteRefundLabel = resolveText('modal.actionConfirmCompleteRefund', 'Xác nhận chuyển khoản hoàn tiền');
    const actionSendBankReminderLabel = resolveText('modal.actionSendBankReminder', 'Gửi nhắc bổ sung ngân hàng');
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
    const refundAmountNumber = Number(refundAmount);
    const bankInfo = activeItem.bankInfo ?? null;
    const bankAccountNumberDisplay = bankInfo?.accountNumber ?? bankInfo?.accountNumberMasked ?? '—';
    const hasAvailableBankInfo = Boolean(bankInfo?.available);
    const requiresBankRefundCompletion = workflowStatus === 'ACCEPTED_FOR_REFUND' && canManageFinanceActions && !isRefundLocked;
    const shouldDisableBankRefundSubmit = (
        processing ||
        isUploadingProofs ||
        !hasAvailableBankInfo ||
        !Number.isFinite(refundAmountNumber) ||
        refundAmountNumber <= 0 ||
        proofUploads.length === 0
    );
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

    useEffect(() => {
        setIsCompleteRefundModalOpen(false);
        setRefundAmount(expectedRefundAmount > 0 ? String(Math.round(expectedRefundAmount)) : '');
        setRefundTransactionRef('');
        setRefundFinanceNote(activeItem.financeNote ?? '');
        setProofUploads(
            (activeItem.refundPayoutProofs ?? []).map((proof) => ({
                fileUrl: proof.fileUrl,
                fileName: proof.fileName ?? null,
            })),
        );
        setToast(null);
    }, [activeItem.returnId, activeItem.financeNote, activeItem.refundPayoutProofs, expectedRefundAmount]);

    const handleUploadProofFiles = async (files: FileList | null) => {
        if (!files?.length) {
            return;
        }

        const selectedFiles = Array.from(files);
        const invalidFile = selectedFiles.find((file) => !file.type.startsWith('image/'));
        if (invalidFile) {
            setToast(resolveText('modal.invalidProofImage', 'Chỉ có thể tải lên ảnh minh chứng.'));
            return;
        }

        setIsUploadingProofs(true);
        setToast(null);

        try {
            const uploadedFiles = await Promise.all(
                selectedFiles.map(async (file) => {
                    const imageData = await fileToBase64(file);
                    return adminReturnReviewService.uploadPayoutProofImage(imageData, file.name);
                }),
            );

            setProofUploads((current) => {
                const deduped = [...current];
                uploadedFiles.forEach((uploaded) => {
                    if (!deduped.some((item) => item.fileUrl === uploaded.fileUrl)) {
                        deduped.push(uploaded);
                    }
                });
                return deduped;
            });
        } catch (error) {
            const typedError = error as Error | { message?: string };
            setToast(typedError.message || resolveText('modal.uploadProofFailed', 'Không thể tải lên ảnh minh chứng.'));
        } finally {
            setIsUploadingProofs(false);
        }
    };

    const handleRemoveProofUpload = (fileUrl: string) => {
        setProofUploads((current) => current.filter((item) => item.fileUrl !== fileUrl));
    };

    const handleOpenCompleteRefundModal = () => {
        setToast(null);
        setIsCompleteRefundModalOpen(true);
    };

    const handleCompleteBankRefund = async () => {
        if (!hasAvailableBankInfo) {
            setToast(resolveText('modal.bankInfoMissing', 'Khách hàng chưa cung cấp thông tin ngân hàng để hoàn tiền.'));
            return;
        }

        if (!Number.isFinite(refundAmountNumber) || refundAmountNumber <= 0) {
            setToast(resolveText('modal.invalidRefundAmount', 'Vui lòng nhập số tiền hoàn hợp lệ.'));
            return;
        }

        if (proofUploads.length === 0) {
            setToast(resolveText('modal.proofImageRequired', 'Cần ít nhất một ảnh minh chứng chuyển khoản.'));
            return;
        }

        setProcessing(true);
        setToast(null);

        try {
            await actions.refund(activeItem.returnId, {
                amount: refundAmountNumber,
                transactionRef: refundTransactionRef.trim() || undefined,
                financeNote: refundFinanceNote.trim() || undefined,
                proofImageUrls: proofUploads.map((item) => item.fileUrl),
                selectedBankAccountId: bankInfo?.bankAccountId ?? undefined,
            });
            setIsCompleteRefundModalOpen(false);
        } finally {
            setProcessing(false);
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
                    onClose={isCompleteRefundModalOpen ? undefined : onClose}
                    maxWidthClassName="max-w-5xl"
                    panelClassName={`${isCompleteRefundModalOpen ? 'hidden' : ''} max-h-[90vh] rounded-2xl`}
                    bodyClassName="max-h-[68vh] overflow-y-auto p-6 space-y-6"
                    closeOnOverlayClick={!isCompleteRefundModalOpen}
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
                                                disabled={processing || isUploadingProofs}
                                                tone={refundAction.tone}
                                                size="md"
                                                className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                            >
                                                {processing || isUploadingProofs ? processingLabel : refundAction.label}
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
                                            disabled={processing || isUploadingProofs}
                                            tone="danger"
                                            size="md"
                                            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                        >
                                            {actionRejectLabel}
                                        </AdminActionButton>
                                    )}
                                    {requiresBankRefundCompletion && !hasAvailableBankInfo && (
                                        <AdminSecondaryButton
                                            onClick={() => void actions.sendBankInfoReminder(activeItem.returnId)}
                                            disabled={processing || isUploadingProofs}
                                            className="px-4 py-3 text-xs font-semibold"
                                        >
                                            {actionSendBankReminderLabel}
                                        </AdminSecondaryButton>
                                    )}
                                    {requiresBankRefundCompletion && (
                                        <AdminActionButton
                                            onClick={handleOpenCompleteRefundModal}
                                            disabled={processing || isUploadingProofs || !hasAvailableBankInfo}
                                            tone="success"
                                            size="md"
                                            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                        >
                                            {processing || isUploadingProofs ? processingLabel : actionContinueRefundLabel}
                                        </AdminActionButton>
                                    )}
                                    {primaryAction && (
                                        <AdminActionButton
                                            onClick={() => primaryAction.onClick(activeItem.returnId)}
                                            disabled={processing || isUploadingProofs}
                                            tone={primaryAction.tone}
                                            size="md"
                                            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                        >
                                            {processing || isUploadingProofs ? processingLabel : primaryAction.label}
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

                {canManageFinanceActions && (workflowStatus === 'ACCEPTED_FOR_REFUND' || activeItem.bankInfo || activeItem.refundCompletedAt) && (
                    <div className="space-y-3">
                        <div className={refundUi.eyeBrow}>
                            {resolveText('modal.bankInfoTitle', 'Thông tin nhận hoàn tiền')}
                        </div>
                        {hasAvailableBankInfo ? (
                            <div className={`${refundUi.sectionMuted} grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_13rem]`}>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                        <Landmark className="h-4 w-4 text-emerald-300" />
                                        <span>{bankInfo?.bankName ?? '—'}</span>
                                        {bankInfo?.bankCode && (
                                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
                                                {bankInfo.bankCode}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid gap-2 text-sm text-white/75 md:grid-cols-2">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                                {resolveText('modal.bankAccountHolder', 'Chủ tài khoản')}
                                            </div>
                                            <div className="mt-1 text-white">{bankInfo?.accountHolder ?? '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                                {resolveText('modal.bankAccountNumber', 'Số tài khoản')}
                                            </div>
                                            <div className="mt-1 text-white">{bankAccountNumberDisplay}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                                {resolveText('modal.bankInfoSource', 'Nguồn thông tin')}
                                            </div>
                                            <div className="mt-1 text-white/70">
                                                {bankInfo?.source ?? resolveText('modal.bankInfoProfileSource', 'Hồ sơ khách hàng')}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                                {resolveText('modal.bankInfoUpdatedAt', 'Cập nhật lần cuối')}
                                            </div>
                                            <div className="mt-1 text-white/70">
                                                {bankInfo?.updatedAt ? formatAdminReturnDateTime(bankInfo.updatedAt) : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    {(activeItem.bankInfoRequestedAt || activeItem.bankInfoSubmittedAt) && (
                                        <div className="grid gap-2 text-[11px] text-white/55 md:grid-cols-2">
                                            <div>
                                                {resolveText('modal.bankInfoRequestedAt', 'Yêu cầu cung cấp: {{date}}', {
                                                    date: activeItem.bankInfoRequestedAt
                                                        ? formatAdminReturnDateTime(activeItem.bankInfoRequestedAt)
                                                        : '—',
                                                })}
                                            </div>
                                            <div>
                                                {resolveText('modal.bankInfoSubmittedAt', 'Khách cập nhật: {{date}}', {
                                                    date: activeItem.bankInfoSubmittedAt
                                                        ? formatAdminReturnDateTime(activeItem.bankInfoSubmittedAt)
                                                        : '—',
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                    {bankInfo?.qrImageUrl ? (
                                        <img
                                            src={getCloudinaryQrImage(bankInfo.qrImageUrl, 900, 900)}
                                            alt={resolveText('modal.bankQrAlt', 'QR tài khoản ngân hàng')}
                                            className="h-full min-h-40 w-full object-contain bg-white/[0.03] p-3"
                                        />
                                    ) : (
                                        <div className="flex h-full min-h-40 items-center justify-center px-4 text-center text-xs text-white/45">
                                            {resolveText('modal.bankQrEmpty', 'Chưa có ảnh QR cho tài khoản này.')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={`${refundUi.warning} flex items-start gap-3 p-4 text-sm text-amber-100`}>
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1">
                                    <div className="font-medium">
                                        {resolveText('modal.bankInfoMissing', 'Khách hàng chưa cung cấp thông tin ngân hàng để hoàn tiền.')}
                                    </div>
                                    <div className="text-xs text-amber-100/80">
                                        {resolveText(
                                            'modal.bankInfoMissingHint',
                                            'Hãy yêu cầu khách cập nhật mục tài khoản nhận hoàn tiền trong hồ sơ trước khi xác nhận chuyển khoản.',
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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

                {Array.isArray(activeItem.refundPayoutProofs) && activeItem.refundPayoutProofs.length > 0 && (
                    <div>
                        <div className={`${refundUi.eyeBrow} mb-2`}>
                            {refundProofTitle}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {activeItem.refundPayoutProofs.map((proof) => (
                                <button
                                    key={proof.refundPayoutProofId}
                                    type="button"
                                    onClick={() => setLightboxImg(proof.fileUrl)}
                                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-white/25"
                                >
                                    <div className="relative aspect-[4/3] bg-black/20">
                                        <img
                                            src={proof.fileUrl}
                                            alt={proof.fileName ?? refundPayoutProofAlt}
                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                            <Search className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 px-3 py-2">
                                        <div className="truncate text-xs text-white/75">
                                            {proof.fileName ?? refundPayoutProofOpenLabel}
                                        </div>
                                        <div className="text-[11px] text-white/45">
                                            {formatAdminReturnDateTime(proof.createdAt)}
                                        </div>
                                    </div>
                                </button>
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

            {isCompleteRefundModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 md:p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={resolveText('modal.completeRefundTitle', 'Xác nhận chuyển khoản hoàn tiền')}
                        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-[0_20px_60px_rgba(0,0,0,0.38)] md:max-h-[calc(100vh-2rem)]"
                    >
                        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-gray-200/10 px-6 py-5">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                                    <Landmark className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-[1.35rem] font-black leading-tight text-white">
                                        {resolveText('modal.completeRefundTitle', 'Xác nhận chuyển khoản hoàn tiền')}
                                    </h2>
                                    <p className="mt-1 truncate text-sm text-white/35">
                                        {orderInfoLabel}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label={closeModalLabel}
                                className="ui-stable-click inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70"
                                onClick={() => setIsCompleteRefundModalOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-6">
                    <div className={`${refundUi.sectionMuted} grid gap-4 p-4 md:grid-cols-3`}>
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                {resolveText('modal.completeRefundExpectedAmount', 'Hoàn tiền dự kiến')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-emerald-300">
                                {expectedRefundAmount > 0 ? formatAdminReturnMoneyVND(expectedRefundAmount) : '—'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                {resolveText('modal.completeRefundBank', 'Ngân hàng nhận')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                                {bankInfo?.bankName ?? '—'}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                                {resolveText('modal.completeRefundAccountNumber', 'Số tài khoản')}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                                {bankAccountNumberDisplay}
                            </div>
                        </div>
                    </div>

                    <div className={`${refundUi.sectionMuted} space-y-4 p-4`}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                                    {resolveText('modal.completeRefundAmount', 'Số tiền hoàn')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    aria-label={resolveText('modal.completeRefundAmount', 'Số tiền hoàn')}
                                    value={refundAmount}
                                    onChange={(event) => setRefundAmount(event.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                    placeholder={String(Math.round(expectedRefundAmount))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                                    {resolveText('modal.completeRefundTransactionRef', 'Mã giao dịch')}
                                </label>
                                <input
                                    type="text"
                                    aria-label={resolveText('modal.completeRefundTransactionRef', 'Mã giao dịch')}
                                    value={refundTransactionRef}
                                    onChange={(event) => setRefundTransactionRef(event.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                    placeholder={resolveText('modal.completeRefundTransactionRefPlaceholder', 'Ví dụ: VCB240403-001')}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                                {financeNoteLabel}
                            </label>
                            <textarea
                                aria-label={financeNoteLabel}
                                value={refundFinanceNote}
                                onChange={(event) => setRefundFinanceNote(event.target.value)}
                                placeholder={resolveText(
                                    'modal.completeRefundFinanceNotePlaceholder',
                                    'Ghi chú nội bộ về lần chuyển khoản này...',
                                )}
                                className="min-h-28 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                                        {resolveText('modal.completeRefundProofTitle', 'Ảnh minh chứng chuyển khoản')}
                                    </div>
                                    <div className="mt-1 text-xs text-white/50">
                                        {resolveText(
                                            'modal.completeRefundProofHint',
                                            'Tải lên ít nhất một ảnh để lưu vào hồ sơ hoàn tiền của yêu cầu này.',
                                        )}
                                    </div>
                                </div>
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:text-white">
                                    <ImagePlus className="h-4 w-4" />
                                    {isUploadingProofs
                                        ? processingLabel
                                        : resolveText('modal.completeRefundUploadProof', 'Tải ảnh lên')}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(event) => {
                                            void handleUploadProofFiles(event.target.files);
                                            event.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>

                            {proofUploads.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {proofUploads.map((proof, index) => (
                                        <div
                                            key={`${proof.fileUrl}-${index}`}
                                            className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                                        >
                                            <div className="relative aspect-[4/3] bg-black/20">
                                                <img
                                                    src={proof.fileUrl}
                                                    alt={proof.fileName ?? proofImageAlt(index + 1)}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                                                <div className="min-w-0 text-xs text-white/65">
                                                    <div className="truncate">
                                                        {proof.fileName ?? resolveText('modal.completeRefundProofLabel', 'Ảnh minh chứng {{index}}', {
                                                            index: index + 1,
                                                        })}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProofUpload(proof.fileUrl)}
                                                    className="rounded-full border border-red-400/20 p-2 text-red-200 transition hover:border-red-400/40 hover:bg-red-400/10"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
                                    {resolveText('modal.completeRefundProofEmpty', 'Chưa có ảnh minh chứng nào được tải lên.')}
                                </div>
                            )}
                        </div>
                    </div>
                        </div>

                        <div className="shrink-0 border-t border-gray-200/10 px-6 py-5">
                            <div className="space-y-3">
                                {toast && (
                                    <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                                        {toast}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3">
                                    <AdminSecondaryButton
                                        onClick={() => setIsCompleteRefundModalOpen(false)}
                                        className="px-4 py-3 text-xs font-semibold"
                                    >
                                        {actionCancelRejectLabel}
                                    </AdminSecondaryButton>
                                    <AdminActionButton
                                        onClick={() => void handleCompleteBankRefund()}
                                        disabled={shouldDisableBankRefundSubmit}
                                        tone="success"
                                        size="md"
                                        className="flex-1 cursor-pointer py-3 text-xs font-semibold"
                                    >
                                        {processing || isUploadingProofs ? processingLabel : actionConfirmCompleteRefundLabel}
                                    </AdminActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
