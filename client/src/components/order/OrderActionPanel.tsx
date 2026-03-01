import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Loader2, ShoppingBag, Package, Truck, CheckCircle2,
    XCircle, RotateCcw, AlertTriangle,
} from 'lucide-react';
import {
    ORDER_STATUS,
    ORDER_STATUS_META,
    STATUS_ACTION_LABELS,
    getValidNextStatuses,
    type OrderStatusValue,
} from '../../config/orderStatus.config';
import { adminOrderService } from '../../services/order.service';

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
    const [note, setNote] = useState('');
    const isCancelled = targetStatus === ORDER_STATUS.CANCELLED;
    const meta = ORDER_STATUS_META[targetStatus];
    const presets = isCancelled ? CANCEL_PRESETS : RETURN_PRESETS;
    const title = isCancelled ? 'Hủy đơn hàng' : 'Xác nhận hoàn trả';
    const placeholder = isCancelled
        ? 'Mô tả lý do hủy đơn hàng...'
        : 'Mô tả lý do hoàn trả...';
    const hint = isCancelled
        ? 'Tồn kho sẽ được hoàn trả tự động sau khi xác nhận.'
        : 'Tồn kho sẽ được hoàn trả tự động sau khi xác nhận.';

    useEffect(() => { setNote(''); }, [targetStatus]);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            {/* Sheet */}
            <div className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Accent bar in status color */}
                <div className={`h-0.5 w-full bg-gradient-to-r from-transparent via-current to-transparent ${meta.textClass}`} />

                <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeClass}`}>
                            <AlertTriangle size={18} className={meta.textClass} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">{title}</h3>
                            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{hint}</p>
                        </div>
                    </div>

                    {/* Reason textarea */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">
                            Lý do <span className={`normal-case ${meta.textClass}`}>*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none transition-all"
                        />
                    </div>

                    {/* Quick reason chips */}
                    <div className="flex flex-wrap gap-2">
                        {presets.map(p => (
                            <button
                                key={p}
                                onClick={() => setNote(p)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${note === p
                                    ? `${meta.badgeClass} ${meta.textClass}`
                                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80 hover:border-white/20'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer disabled:opacity-50"
                        >
                            Giữ lại
                        </button>
                        <button
                            onClick={() => onConfirm(note)}
                            disabled={loading || !note.trim()}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${meta.actionClass}`}
                        >
                            {loading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <StatusIcon name={meta.icon} size={14} />}
                            {loading ? 'Đang xử lý...' : STATUS_ACTION_LABELS[targetStatus]}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
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
    const meta = ORDER_STATUS_META[targetStatus];
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[#111114] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className={`h-0.5 w-full bg-gradient-to-r from-transparent via-current to-transparent ${meta.textClass}`} />
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeClass}`}>
                            <StatusIcon name={meta.icon} size={18} className={meta.textClass} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">{STATUS_ACTION_LABELS[targetStatus]}</h3>
                            <p className="text-xs text-white/40 mt-0.5">
                                Xác nhận chuyển sang trạng thái <span className={`font-semibold ${meta.textClass}`}>{meta.label}</span>?
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${meta.actionClass}`}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <StatusIcon name={meta.icon} size={14} />}
                            {loading ? 'Đang xử lý...' : 'Xác nhận'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderActionPanel — main export
// ─────────────────────────────────────────────────────────────────────────────

interface OrderActionPanelProps {
    orderId: number;
    currentStatus: string;
    onStatusUpdated: () => void;
    onError: (msg: string) => void;
}

type DialogState =
    | { type: 'none' }
    | { type: 'confirm'; target: OrderStatusValue }
    | { type: 'note'; target: OrderStatusValue };

/**
 * Fully data-driven action panel.
 * Uses the FSM config to determine which buttons to show — zero hardcoded `if` chains.
 */
export const OrderActionPanel: React.FC<OrderActionPanelProps> = ({
    orderId,
    currentStatus,
    onStatusUpdated,
    onError,
}) => {
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

    const nextStatuses = getValidNextStatuses(currentStatus);

    const handleButtonClick = (target: OrderStatusValue) => {
        const meta = ORDER_STATUS_META[target];
        if (meta.requiresNote) {
            setDialog({ type: 'note', target });
        } else {
            setDialog({ type: 'confirm', target });
        }
    };

    const executeTransition = async (target: OrderStatusValue, note?: string) => {
        setLoading(true);
        try {
            await adminOrderService.updateStatus(orderId, { status: target, note });
            setDialog({ type: 'none' });
            onStatusUpdated();
        } catch (err: any) {
            const msg = err?.response?.data?.message
                || err?.response?.data?.error
                || err?.message
                || 'Có lỗi xảy ra';
            onError(msg);
            setDialog({ type: 'none' });
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
                    onClose={() => setDialog({ type: 'none' })}
                    onConfirm={(note) => executeTransition(dialog.target, note)}
                />
            )}
            {dialog.type === 'confirm' && (
                <ConfirmDialog
                    targetStatus={dialog.target}
                    loading={loading}
                    onClose={() => setDialog({ type: 'none' })}
                    onConfirm={() => executeTransition(dialog.target)}
                />
            )}

            {/* Action buttons — one per valid next state */}
            <div className="flex items-center gap-2">
                {nextStatuses.map((target) => {
                    const meta = ORDER_STATUS_META[target];
                    const isCancelLike = target === ORDER_STATUS.CANCELLED || target === ORDER_STATUS.RETURNED;

                    if (isCancelLike) {
                        return (
                            <button
                                key={target}
                                onClick={() => handleButtonClick(target)}
                                disabled={loading}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${meta.badgeClass} ${meta.textClass} hover:brightness-110`}
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <StatusIcon name={meta.icon} size={13} />}
                                {STATUS_ACTION_LABELS[target]}
                            </button>
                        );
                    }

                    return (
                        <button
                            key={target}
                            onClick={() => handleButtonClick(target)}
                            disabled={loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${meta.actionClass}`}
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <StatusIcon name={meta.icon} size={13} />}
                            {STATUS_ACTION_LABELS[target]}
                        </button>
                    );
                })}
            </div>
        </>
    );
};
