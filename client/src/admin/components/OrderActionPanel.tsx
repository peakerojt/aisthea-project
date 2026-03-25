import React, { startTransition, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    Loader2, ShoppingBag, Package, Truck, CheckCircle2,
    XCircle, RotateCcw, AlertTriangle, ImagePlus, CheckSquare, Square,
} from 'lucide-react';
import {
    AdminActionButton,
    AdminModalShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';
import {
    ORDER_STATUS,
    ORDER_STATUS_META,
    STATUS_ACTION_LABELS,
    getValidNextStatuses,
    type OrderStatusValue,
} from '@/config/orderStatus.config';
import {
    adminOrderService,
    createDeliveryProofFileKey,
    type DeliveryProofUploadProgress,
} from '@/common/services/order.service';

// ─────────────────────────────────────────────────────────────────────────────
// Icon resolver — maps icon name string from config to Lucide component
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
    ShoppingBag, Package, Truck, CheckCircle2, XCircle, RotateCcw,
};
const StatusIcon: React.FC<{ name: string; size?: number; className?: string }> = ({
    name, size = 14, className,
}) => {
    const Icon = ICON_MAP[name] ?? Package;
    return <Icon size={size} className={className} />;
};

const getActionTone = (targetStatus: OrderStatusValue) => {
    if (targetStatus === ORDER_STATUS.PENDING) return 'warning' as const;
    if (targetStatus === ORDER_STATUS.PROCESSING) return 'info' as const;
    if (targetStatus === ORDER_STATUS.SHIPPING) return 'cyan' as const;
    if (targetStatus === ORDER_STATUS.DELIVERED) return 'success' as const;
    if (targetStatus === ORDER_STATUS.CANCELLED) return 'danger' as const;
    return 'orange' as const;
};

const getNextStatusesForOrderAction = (currentStatus: string) => {
    const normalized = currentStatus.trim().toUpperCase();
    if (normalized === 'RETURN_REQUESTED') {
        return [ORDER_STATUS.RETURNED];
    }

    return getValidNextStatuses(currentStatus);
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancellation / Note Dialog — glassmorphic sheet
// ─────────────────────────────────────────────────────────────────────────────

interface NoteDialogProps {
    targetStatus: OrderStatusValue;
    loading: boolean;
    onClose: () => void;
    onConfirm: (note: string) => void;
}

const CANCEL_PRESETS = [
    'Khách hàng yêu cầu hủy',
    'Hàng hết tồn kho',
    'Địa chỉ không hợp lệ',
    'Nghi ngờ gian lận',
];

const RETURN_PRESETS = [
    'Sản phẩm bị hư hỏng',
    'Giao sai hàng',
    'Khách hàng không nhận',
    'Chất lượng không đạt',
];

const NoteDialog: React.FC<NoteDialogProps> = ({ targetStatus, loading, onClose, onConfirm }) => {
    const { t: rawT } = useTranslation('orders');
    const [note, setNote] = useState('');
    const isCancelled = targetStatus === ORDER_STATUS.CANCELLED;
    const meta = ORDER_STATUS_META[targetStatus];
    const presets = isCancelled ? CANCEL_PRESETS : RETURN_PRESETS;
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const translated = rawT(key, { ...(options ?? {}), defaultValue: fallback });
        return translated === key ? fallback : translated;
    };
    const title = isCancelled
        ? resolveText('statusDialog.cancelOrder.title', 'Hủy đơn hàng')
        : resolveText('statusDialog.returned.title', 'Xác nhận trả hàng');
    const placeholder = isCancelled
        ? resolveText('statusDialog.cancelOrder.placeholder', 'Mô tả lý do hủy đơn hàng...')
        : resolveText('statusDialog.returned.placeholder', 'Mô tả lý do trả hàng...');
    const hint = resolveText(
        'statusDialog.common.hint',
        'Tồn kho sẽ được hoàn lại tự động sau khi xác nhận.',
    );
    const keepLabel = resolveText('statusDialog.common.keep', 'Giữ lại');
    const processingLabel = resolveText('statusDialog.common.processing', 'Đang xử lý...');
    const reasonLabel = resolveText('statusDialog.common.reason', 'Lý do');

    useEffect(() => { setNote(''); }, [targetStatus]);

    return createPortal(
        <AdminModalShell
            icon={AlertTriangle}
            iconWrapperClassName={`${meta.badgeClass} rounded-xl`}
            iconClassName={meta.textClass}
            title={title}
            subtitle={hint}
            onClose={onClose}
            align="center"
            maxWidthClassName="max-w-md"
            bodyClassName="space-y-5 p-6"
            footer={(
                <div className="flex gap-3 pt-1">
                    <AdminSecondaryButton
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5"
                    >
                        {keepLabel}
                    </AdminSecondaryButton>
                    <AdminActionButton
                        onClick={() => onConfirm(note)}
                        disabled={loading || !note.trim()}
                        tone={getActionTone(targetStatus)}
                        variant="solid"
                        size="md"
                        className="flex-1 py-2.5 text-sm font-bold shadow-lg"
                    >
                        {loading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <StatusIcon name={meta.icon} size={14} />}
                        {loading ? processingLabel : STATUS_ACTION_LABELS[targetStatus]}
                    </AdminActionButton>
                </div>
            )}
        >

                    {/* Reason textarea */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">
                            {reasonLabel} <span className={`normal-case ${meta.textClass}`}>*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none transition-colors"
                        />
                    </div>

                    {/* Quick reason chips */}
                    <div className="flex flex-wrap gap-2">
                        {presets.map(p => (
                            <button
                                key={p}
                                onClick={() => setNote(p)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${note === p
                                    ? `${meta.badgeClass} ${meta.textClass}`
                                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80 hover:border-white/20'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
        </AdminModalShell>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation Dialog — for non-note transitions
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
    targetStatus: OrderStatusValue;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ targetStatus, loading, onClose, onConfirm }) => {
    const { t: rawT } = useTranslation('orders');
    const meta = ORDER_STATUS_META[targetStatus];
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const translated = rawT(key, { ...(options ?? {}), defaultValue: fallback });
        return translated === key ? fallback : translated;
    };
    const confirmPrefixLabel = resolveText(
        'statusDialog.common.confirmPrefix',
        'Xác nhận chuyển sang trạng thái',
    );
    const cancelLabel = resolveText('statusDialog.common.cancel', 'Hủy bỏ');
    const confirmLabel = resolveText('statusDialog.common.confirm', 'Xác nhận');
    const processingLabel = resolveText('statusDialog.common.processing', 'Đang xử lý...');
    return createPortal(
        <AdminModalShell
            icon={ICON_MAP[meta.icon] ?? Package}
            iconWrapperClassName={`${meta.badgeClass} rounded-xl`}
            iconClassName={meta.textClass}
            title={STATUS_ACTION_LABELS[targetStatus]}
            subtitle={<>{confirmPrefixLabel} <span className={`font-semibold ${meta.textClass}`}>{meta.label}</span>?</>}
            onClose={onClose}
            maxWidthClassName="max-w-sm"
            bodyClassName="p-6"
            footer={(
                <div className="flex gap-3">
                    <AdminSecondaryButton
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5"
                    >
                        {cancelLabel}
                    </AdminSecondaryButton>
                    <AdminActionButton
                        onClick={onConfirm}
                        disabled={loading}
                        tone={getActionTone(targetStatus)}
                        variant="solid"
                        size="md"
                        className="flex-1 py-2.5 text-sm font-bold shadow-lg"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <StatusIcon name={meta.icon} size={14} />}
                        {loading ? processingLabel : confirmLabel}
                    </AdminActionButton>
                </div>
            )}
        />,
        document.body
    );
};

interface DeliveryProofDialogProps {
    loading: boolean;
    uploadProgress: Record<string, DeliveryProofUploadProgress>;
    onClose: () => void;
    onConfirm: (payload: { files: File[]; reviewed: boolean }) => void;
}

interface DeliveryProofPreviewCardProps {
    fileKey: string;
    fileName: string;
    previewUrl: string | null;
    progressPercent: number;
    progressStatus?: DeliveryProofUploadProgress['status'];
    disabled: boolean;
    onRemove: (fileKey: string) => void;
}

const MAX_DELIVERY_PROOF_IMAGES = 5;
const MAX_DELIVERY_PROOF_DIMENSION = 1600;
const DELIVERY_PROOF_COMPRESSION_THRESHOLD = 1.25 * 1024 * 1024;

const createPreviewUrl = (file: File) => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return null;
    }

    return URL.createObjectURL(file);
};

const revokePreviewUrl = (previewUrl: string | null) => {
    if (!previewUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
        return;
    }

    URL.revokeObjectURL(previewUrl);
};

const loadImageFromUrl = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể đọc ảnh giao hàng.'));
        image.src = src;
    });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });

const optimizeDeliveryProofFile = async (file: File): Promise<File> => {
    if (
        typeof document === 'undefined'
        || typeof HTMLCanvasElement === 'undefined'
        || !file.type.startsWith('image/')
        || file.type === 'image/gif'
    ) {
        return file;
    }

    const tempUrl = createPreviewUrl(file);
    if (!tempUrl) return file;

    try {
        const image = await loadImageFromUrl(tempUrl);
        const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
        const shouldResize = longestEdge > MAX_DELIVERY_PROOF_DIMENSION;
        const shouldCompress = file.size > DELIVERY_PROOF_COMPRESSION_THRESHOLD;

        if (!shouldResize && !shouldCompress) {
            return file;
        }

        const scale = Math.min(
            1,
            MAX_DELIVERY_PROOF_DIMENSION / image.naturalWidth,
            MAX_DELIVERY_PROOF_DIMENSION / image.naturalHeight,
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
            return file;
        }

        context.drawImage(image, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await canvasToBlob(canvas, outputType, outputType === 'image/png' ? undefined : 0.82);

        if (!blob || blob.size >= file.size) {
            return file;
        }

        const nextName = outputType === 'image/png'
            ? file.name.replace(/\.[^.]+$/u, '.png')
            : file.name.replace(/\.[^.]+$/u, '.jpg');

        return new File([blob], nextName, {
            type: outputType,
            lastModified: file.lastModified,
        });
    } catch {
        return file;
    } finally {
        revokePreviewUrl(tempUrl);
    }
};

const DeliveryProofPreviewCard = React.memo(function DeliveryProofPreviewCard({
    fileKey,
    fileName,
    previewUrl,
    progressPercent,
    progressStatus,
    disabled,
    onRemove,
}: DeliveryProofPreviewCardProps) {
    const progressLabel = progressStatus === 'completed'
        ? 'Đã tải lên'
        : progressStatus === 'failed'
            ? 'Tải lên thất bại'
            : progressStatus === 'uploading'
                ? `Đang tải lên ${progressPercent}%`
                : 'Chờ xác nhận để bắt đầu tải lên';

    return (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30" style={{ contain: 'paint' }}>
            {previewUrl ? (
                <img src={previewUrl} alt={fileName} className="h-28 w-full object-cover" />
            ) : (
                <div className="flex h-28 w-full items-center justify-center bg-white/[0.03] text-white/35">
                    <ImagePlus size={28} />
                </div>
            )}
            <button
                type="button"
                onClick={() => onRemove(fileKey)}
                disabled={disabled}
                className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/70 transition-colors duration-150 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
                <XCircle size={14} />
            </button>
            <div className="space-y-1.5 px-2.5 py-2">
                <div className="truncate text-[10px] text-white/60">{fileName}</div>
                <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                            className={`h-full origin-left transform-gpu transition-transform duration-200 ease-out will-change-transform ${progressStatus === 'failed'
                                ? 'bg-red-400'
                                : progressStatus === 'completed'
                                    ? 'bg-emerald-400'
                                    : 'bg-cyan-400'
                                }`}
                            style={{ transform: `scaleX(${Math.max(0, Math.min(progressPercent, 100)) / 100})` }}
                        />
                    </div>
                    <div className={`text-[10px] ${progressStatus === 'failed'
                        ? 'text-red-300'
                        : progressStatus === 'completed'
                            ? 'text-emerald-300'
                            : 'text-white/45'
                        }`}
                    >
                        {progressLabel}
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) =>
    prev.fileKey === next.fileKey
    && prev.fileName === next.fileName
    && prev.previewUrl === next.previewUrl
    && prev.progressPercent === next.progressPercent
    && prev.progressStatus === next.progressStatus
    && prev.disabled === next.disabled
);

const DeliveryProofDialog: React.FC<DeliveryProofDialogProps> = ({
    loading,
    uploadProgress,
    onClose,
    onConfirm,
}) => {
    const { t: rawT } = useTranslation('orders');
    const [files, setFiles] = useState<Array<{ key: string; file: File; previewUrl: string | null }>>([]);
    const [reviewed, setReviewed] = useState(false);
    const [isPreparingFiles, setIsPreparingFiles] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const translated = rawT(key, { ...(options ?? {}), defaultValue: fallback });
        return translated === key ? fallback : translated;
    };
    const titleLabel = resolveText('statusDialog.deliveryProof.title', 'Xác nhận đã giao hàng');
    const subtitleLabel = resolveText(
        'statusDialog.deliveryProof.subtitle',
        'Tải lên ảnh xác nhận giao hàng và đánh dấu đã xem lại hình ảnh trước khi chuyển đơn sang trạng thái đã giao hàng.',
    );
    const cancelLabel = resolveText('statusDialog.common.cancel', 'Hủy bỏ');
    const processingLabel = resolveText('statusDialog.common.processing', 'Đang xử lý...');
    const uploadingLabel = resolveText('statusDialog.deliveryProof.uploading', 'Đang tải ảnh...');
    const confirmLabel = resolveText('statusDialog.deliveryProof.confirm', 'Xác nhận đã giao');
    const uploadLabel = resolveText('statusDialog.deliveryProof.uploadLabel', 'Ảnh xác nhận giao hàng');
    const preparingLabel = resolveText('statusDialog.deliveryProof.preparing', 'Đang tối ưu ảnh giao hàng...');
    const chooseLabel = resolveText('statusDialog.deliveryProof.choose', 'Chọn tối đa 5 ảnh giao hàng');
    const helperLabel = resolveText(
        'statusDialog.deliveryProof.helper',
        'JPEG, PNG, WEBP hoặc GIF. Mỗi ảnh tối đa 5MB. Ảnh sẽ được tối ưu nhẹ trước khi tải lên để giảm lag.',
    );
    const reviewTitleLabel = resolveText(
        'statusDialog.deliveryProof.reviewTitle',
        'Đã xem lại hình ảnh giao hàng',
    );
    const reviewDescriptionLabel = resolveText(
        'statusDialog.deliveryProof.reviewDescription',
        'Mình xác nhận ảnh tải lên là đúng đơn hàng và đủ để chứng minh đã giao.',
    );
    const reviewErrorLabel = resolveText(
        'statusDialog.deliveryProof.reviewError',
        'Vui lòng xác nhận đã xem lại hình ảnh giao hàng trước khi tiếp tục.',
    );
    const isUploadingFiles = Object.values(uploadProgress).some(
        (item) => item.status === 'pending' || item.status === 'uploading',
    );
    const handleClose = () => {
        if (loading || isPreparingFiles) return;
        onClose();
    };

    useEffect(() => {
        return () => {
            files.forEach((item) => revokePreviewUrl(item.previewUrl));
        };
    }, [files]);

    const appendFiles = async (incoming: FileList | null) => {
        if (!incoming) return;

        const remainingSlots = Math.max(0, MAX_DELIVERY_PROOF_IMAGES - files.length);
        const rawFiles = Array.from(incoming)
            .filter((file) => file.type.startsWith('image/'))
            .slice(0, remainingSlots);

        if (rawFiles.length === 0) return;

        setIsPreparingFiles(true);
        try {
            const nextFiles = await Promise.all(
                rawFiles.map(async (rawFile) => {
                    const optimizedFile = await optimizeDeliveryProofFile(rawFile);
                    return {
                        key: createDeliveryProofFileKey(optimizedFile),
                        file: optimizedFile,
                        previewUrl: createPreviewUrl(optimizedFile),
                    };
                }),
            );

            startTransition(() => {
                setFiles((prev) => [...prev, ...nextFiles].slice(0, MAX_DELIVERY_PROOF_IMAGES));
            });
            if (nextFiles.length > 0) {
                setReviewError('');
            }
        } finally {
            setIsPreparingFiles(false);
        }
    };

    const removeFile = (fileKey: string) => {
        setFiles((prev) => {
            const target = prev.find((item) => item.key === fileKey);
            if (target) revokePreviewUrl(target.previewUrl);
            return prev.filter((item) => item.key !== fileKey);
        });
    };

    return createPortal(
        <AdminModalShell
            icon={ImagePlus}
            iconWrapperClassName="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            iconClassName="text-emerald-400"
            title={titleLabel}
            subtitle={subtitleLabel}
            onClose={handleClose}
            maxWidthClassName="max-w-2xl"
            panelClassName="shadow-2xl shadow-black/40"
            bodyClassName="space-y-5 p-6"
            footer={(
                <div className="flex gap-3">
                    <AdminSecondaryButton
                        onClick={handleClose}
                        disabled={loading || isPreparingFiles}
                        className="flex-1 py-2.5"
                    >
                        {cancelLabel}
                    </AdminSecondaryButton>
                    <AdminPrimaryButton
                        onClick={() => {
                            if (!reviewed) {
                                setReviewError(reviewErrorLabel);
                                return;
                            }

                            onConfirm({ files: files.map((item) => item.file), reviewed });
                        }}
                        disabled={loading || isPreparingFiles || files.length === 0}
                        className="flex-1 bg-emerald-600 py-2.5 shadow-md shadow-emerald-950/20 hover:bg-emerald-500"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {loading ? (isUploadingFiles ? uploadingLabel : processingLabel) : confirmLabel}
                    </AdminPrimaryButton>
                </div>
            )}
        >

                    <div className="space-y-3">
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40">
                            {uploadLabel} <span className="text-emerald-400 normal-case">*</span>
                        </label>
                        <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors duration-150 ${isPreparingFiles
                            ? 'cursor-wait border-emerald-400/25 bg-emerald-400/[0.05]'
                            : 'cursor-pointer border-white/15 bg-white/[0.03] hover:border-emerald-400/40 hover:bg-emerald-400/[0.04]'
                            }`}>
                            <ImagePlus size={22} className="text-emerald-400" />
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {isPreparingFiles ? preparingLabel : chooseLabel}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                    {helperLabel}
                                </p>
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                multiple
                                className="hidden"
                                disabled={loading || isPreparingFiles}
                                onChange={(e) => {
                                    void appendFiles(e.target.files);
                                    e.currentTarget.value = '';
                                }}
                            />
                        </label>

                        {files.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {files.map((item) => {
                                    const progress = uploadProgress[item.key];
                                    const progressPercent = progress?.percent ?? 0;

                                    return (
                                        <DeliveryProofPreviewCard
                                            key={item.key}
                                            fileKey={item.key}
                                            fileName={item.file.name}
                                            previewUrl={item.previewUrl}
                                            progressPercent={progressPercent}
                                            progressStatus={progress?.status}
                                            disabled={loading || isPreparingFiles}
                                            onRemove={removeFile}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setReviewed((value) => {
                                const nextValue = !value;
                                if (nextValue) {
                                    setReviewError('');
                                }
                                return nextValue;
                            });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer ${reviewed
                            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                            : reviewError
                                ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20'
                            }`}
                    >
                        {reviewed ? <CheckSquare size={18} /> : <Square size={18} />}
                        <div>
                            <p className="text-sm font-semibold">{reviewTitleLabel}</p>
                            <p className="text-xs opacity-70 mt-0.5">{reviewDescriptionLabel}</p>
                        </div>
                    </button>
                    {reviewError && (
                        <p className="text-xs text-amber-300 -mt-1">{reviewError}</p>
                    )}
        </AdminModalShell>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderActionPanel — main export
// ─────────────────────────────────────────────────────────────────────────────

interface OrderActionPanelProps {
    orderId: number;
    currentStatus: string;
    onStatusUpdated: (msgKey?: string) => void;
    onError: (msg: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

type DialogState =
    | { type: 'none' }
    | { type: 'confirm'; target: OrderStatusValue }
    | { type: 'note'; target: OrderStatusValue }
    | { type: 'deliveryProof'; target: OrderStatusValue }

/**
 * Fully data-driven action panel.
 * Uses the FSM config to determine which buttons to show — zero hardcoded \`if\` chains.
 */
export const OrderActionPanel: React.FC<OrderActionPanelProps> = ({
    orderId,
    currentStatus,
    onStatusUpdated,
    onError,
}) => {
    const { t } = useTranslation('errors');
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
    const [uploadProgress, setUploadProgress] = useState<Record<string, DeliveryProofUploadProgress>>({});

    const nextStatuses = getNextStatusesForOrderAction(currentStatus);

    const closeDialog = () => {
        setDialog({ type: 'none' });
        setUploadProgress({});
    };

    const handleButtonClick = (target: OrderStatusValue) => {
        const meta = ORDER_STATUS_META[target];
        if (target === ORDER_STATUS.DELIVERED) {
            setUploadProgress({});
            setDialog({ type: 'deliveryProof', target });
            return;
        }
        if (meta.requiresNote) {
            setDialog({ type: 'note', target });
        } else {
            setDialog({ type: 'confirm', target });
        }
    };

    const executeTransition = async (
        target: OrderStatusValue,
        note?: string,
        deliveryProof?: { files: File[]; reviewed: boolean },
    ) => {
        setLoading(true);
        try {
            let deliveryProofImages: string[] | undefined;
            let deliveryProofReviewed: boolean | undefined;

            if (target === ORDER_STATUS.DELIVERED) {
                const proof = deliveryProof ?? { files: [], reviewed: false };
                if (proof.files.length === 0) {
                    onError('Vui lòng tải lên ít nhất 1 ảnh xác nhận giao hàng.');
                    setLoading(false);
                    return;
                }
                if (!proof.reviewed) {
                    onError('Vui lòng xác nhận đã xem lại hình ảnh giao hàng.');
                    setLoading(false);
                    return;
                }

                setUploadProgress(
                    Object.fromEntries(
                        proof.files.map((file) => [
                            createDeliveryProofFileKey(file),
                            {
                                fileKey: createDeliveryProofFileKey(file),
                                fileName: file.name,
                                percent: 0,
                                status: 'pending' as const,
                            },
                        ]),
                    ),
                );

                const uploadedImages = await adminOrderService.uploadDeliveryProofImages(
                    orderId,
                    proof.files,
                    (progress) => {
                        setUploadProgress((prev) => ({
                            ...prev,
                            [progress.fileKey]: progress,
                        }));
                    },
                );
                deliveryProofImages = uploadedImages.map((item) => item.url);
                deliveryProofReviewed = proof.reviewed;
            }

            const res = await adminOrderService.updateStatus(orderId, {
                status: target,
                note,
                deliveryProofImages,
                deliveryProofReviewed,
            });
            closeDialog();
            const messageKey = (res as { messageKey?: string })?.messageKey || 'ORDER_STATUS_UPDATED';
            onStatusUpdated(messageKey);
        } catch (err: unknown) {
            const errorResponse = err as { response?: { data?: { errorCode?: string; message?: string; error?: string } }; message?: string };
            const errorCode = errorResponse?.response?.data?.errorCode;
            const msg = errorCode
                ? t(errorCode, { defaultValue: errorCode })
                : (errorResponse?.response?.data?.message
                    || errorResponse?.response?.data?.error
                    || errorResponse?.message
                    || t('INTERNAL_SERVER_ERROR'));
            onError(msg);
            if (target !== ORDER_STATUS.DELIVERED) {
                closeDialog();
            }
        } finally {
            setLoading(false);
        }
    };

    // Terminal state — no actions possible
    if (nextStatuses.length === 0) {
        const meta = ORDER_STATUS_META[currentStatus as OrderStatusValue];
        if (!meta) return null;
        return (
            <span className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border ${meta.badgeClass} ${meta.textClass}`}>
                <StatusIcon name={meta.icon} size={13} />
                {meta.label}
            </span>
        );
    }

    return (
        <>
            {/* Dialogs */}
            {dialog.type === 'note' && (
                <NoteDialog
                    targetStatus={dialog.target}
                    loading={loading}
                    onClose={closeDialog}
                    onConfirm={(note) => executeTransition(dialog.target, note)}
                />
            )}
            {dialog.type === 'confirm' && (
                <ConfirmDialog
                    targetStatus={dialog.target}
                    loading={loading}
                    onClose={closeDialog}
                    onConfirm={() => executeTransition(dialog.target)}
                />
            )}
            {dialog.type === 'deliveryProof' && (
                <DeliveryProofDialog
                    loading={loading}
                    uploadProgress={uploadProgress}
                    onClose={closeDialog}
                    onConfirm={(proof) => executeTransition(dialog.target, undefined, proof)}
                />
            )}

            {/* Action buttons — one per valid next state */}
            <div className="flex items-center gap-2">
                {nextStatuses.map((target) => {
                    const meta = ORDER_STATUS_META[target];
                    const isCancelLike = target === ORDER_STATUS.CANCELLED || target === ORDER_STATUS.RETURNED;

                    if (isCancelLike) {
                        return (
                            <AdminActionButton
                                key={target}
                                onClick={() => handleButtonClick(target)}
                                disabled={loading}
                                tone={getActionTone(target)}
                                size="md"
                                className="px-4 py-2.5 text-xs font-bold"
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <StatusIcon name={meta.icon} size={13} />}
                                {STATUS_ACTION_LABELS[target]}
                            </AdminActionButton>
                        );
                    }

                    return (
                        <AdminActionButton
                            key={target}
                            onClick={() => handleButtonClick(target)}
                            disabled={loading}
                            tone={getActionTone(target)}
                            variant="solid"
                            size="md"
                            className="px-5 py-2.5 text-xs font-bold shadow-lg"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <StatusIcon name={meta.icon} size={13} />}
                            {STATUS_ACTION_LABELS[target]}
                        </AdminActionButton>
                    );
                })}
            </div>
        </>
    );
};
