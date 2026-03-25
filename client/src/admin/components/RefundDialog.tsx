/**
 * RefundDialog.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise-grade refund dialog for the AISTHEA admin panel.
 *
 * Features:
 *  • Stats row (Tổng đã TT / Đã hoàn / Tối đa hoàn)
 *  • Radio: Hoàn toàn bộ / Hoàn một phần
 *  • Auto-capped amount input (Partial only)
 *  • Method dropdown (Vietnamese)
 *  • Reason textarea
 *  • Submit button with exact formatted amount
 *  • Zod client-side validation before API call
 *  • Smooth open/close animation
 *
 * Design: luxury dark · primary=#E31837 · Be Vietnam Pro
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle, CheckCircle2, Loader2,
    BadgeDollarSign, ChevronDown
} from 'lucide-react';
import {
    AdminModalShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';
import {
    adminRefundService,
    normalizeRefundStatus,
    RefundMethod,
    RefundRecord,
    RefundRequestSchema,
    REFUND_METHODS,
} from '@/admin/services/refund.service';
import { formatCurrencyFullVND } from '@/common/utils/currency';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminRefundDialogProps {
    orderId: number;
    totalPaid: number;           // Total amount paid for this order
    existingRefunds: RefundRecord[];
    onClose: () => void;
    onSuccess: (refund: RefundRecord) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RefundDialog: React.FC<AdminRefundDialogProps> = ({
    orderId,
    totalPaid,
    existingRefunds,
    onClose,
    onSuccess,
}) => {
    const { t } = useTranslation(['orders']);
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const resolveErrorMessage = (key: string) => {
        const fallbackMap: Record<string, string> = {
            'refund.errors.invalidType': 'Loại hoàn tiền không hợp lệ.',
            'refund.errors.invalidMethod': 'Phương thức hoàn tiền không hợp lệ.',
            'refund.errors.amountMustBeNumber': 'Số tiền phải là số.',
            'refund.errors.amountGreaterThanZero': 'Số tiền hoàn phải lớn hơn 0.',
            'refund.errors.amountExceedsLimit': 'Số tiền hoàn vượt quá giới hạn.',
            'refund.errors.reasonMinLength': 'Lý do phải có ít nhất 5 ký tự.',
            'refund.errors.reasonMaxLength': 'Lý do không được vượt quá 500 ký tự.',
            'refund.errors.invalidAmountOrExceeds': 'Số tiền hoàn không hợp lệ hoặc vượt quá mức cho phép.',
            'refund.errors.unknownError': 'Lỗi không xác định.',
        };

        return resolveText(key, fallbackMap[key] ?? key);
    };
    const titleLabel = resolveText('refund.title', 'Hoàn tiền');
    const subtitleLabel = resolveText('refund.orderRef', 'Đơn hàng #{{id}}', { id: orderId });
    const cancelLabel = resolveText('refund.form.cancel', 'Hủy');
    const submittingLabel = resolveText('refund.form.submitting', 'Đang xử lý...');
    const totalPaidLabel = resolveText('refund.stats.totalPaid', 'Tổng đã thanh toán');
    const totalRefundedLabel = resolveText('refund.stats.totalRefunded', 'Đã hoàn');
    const maxRefundableLabel = resolveText('refund.stats.maxRefundable', 'Tối đa có thể hoàn');
    const alreadyFullyRefundedLabel = resolveText(
        'refund.stats.alreadyFullyRefunded',
        'Đơn hàng này đã được hoàn tiền toàn bộ.',
    );
    const refundTypeLabel = resolveText('refund.form.refundType', 'Loại hoàn tiền');
    const typeFullLabel = resolveText('refund.form.typeFull', 'Hoàn toàn bộ');
    const typePartialLabel = resolveText('refund.form.typePartial', 'Hoàn một phần');
    const amountLabel = resolveText('refund.form.amount', 'Số tiền hoàn');
    const methodLabel = resolveText('refund.form.method', 'Phương thức');
    const reasonLabel = resolveText('refund.form.reason', 'Lý do hoàn tiền');
    const reasonPlaceholderLabel = resolveText('refund.form.reasonPlaceholder', 'Mô tả lý do hoàn tiền...');
    const successInitiatedLabel = resolveText(
        'refund.success.initiated',
        'Đã gửi yêu cầu hoàn tiền tới cổng thanh toán.',
    );
    const invalidAmountLabel = resolveText(
        'refund.errors.invalidAmountOrExceeds',
        'Số tiền hoàn không hợp lệ hoặc vượt quá mức cho phép.',
    );
    const unknownErrorLabel = resolveText('refund.errors.unknownError', 'Lỗi không xác định.');
    const refundMethodLabels: Record<RefundMethod, string> = {
        ORIGINAL_GATEWAY: resolveText('refund.method.ORIGINAL_GATEWAY', 'Hoàn qua cổng thanh toán gốc'),
        BANK_TRANSFER: resolveText('refund.method.BANK_TRANSFER', 'Chuyển khoản thủ công'),
        STORE_WALLET: resolveText('refund.method.STORE_WALLET', 'Ví AISTHEA'),
    };

    // ── Derived financial state ───────────────────────────────────────────────
    const totalRefunded = existingRefunds
        .filter(r => normalizeRefundStatus(r.status) === 'SUCCESS')
        .reduce((sum, r) => sum + Number(r.amount), 0);
    const maxRefundable = Math.max(0, totalPaid - totalRefunded);

    // ── Form state ────────────────────────────────────────────────────────────
    const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
    const [method, setMethod] = useState<RefundMethod>('ORIGINAL_GATEWAY');
    const [amountInput, setAmountInput] = useState<string>(String(maxRefundable));
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const reasonRef = useRef<HTMLTextAreaElement>(null);

    // ── Auto-fill amount when switching to FULL ───────────────────────────────
    useEffect(() => {
        if (refundType === 'FULL') {
            setAmountInput(String(maxRefundable));
        }
    }, [refundType, maxRefundable]);

    // ── Cap on change ─────────────────────────────────────────────────────────
    const handleAmountChange = (raw: string) => {
        const n = Number(raw.replace(/\D/g, ''));
        const capped = Math.min(n, maxRefundable);
        setAmountInput(String(capped));
    };

    // ── Validate & submit ─────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        setErrors({});

        const amount = refundType === 'FULL' ? maxRefundable : Number(amountInput);

        const parsed = RefundRequestSchema.safeParse({ type: refundType, method, amount, reason });
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (parsed.error.issues as { path?: string[]; message: string }[]).forEach((e) => {
                const field = String(e.path?.[0] ?? 'amount');
                fieldErrors[field] = resolveErrorMessage(e.message);
            });
            setErrors(fieldErrors);
            return;
        }

        if (amount > maxRefundable) {
            setErrors({ amount: invalidAmountLabel });
            return;
        }

        setSubmitting(true);
        try {
            const res = await adminRefundService.create(orderId, parsed.data);
            if (res.success && res.data) {
                setToast({ type: 'success', msg: successInitiatedLabel });
                setTimeout(() => {
                    onSuccess(res.data!);
                    onClose();
                }, 1500);
            } else {
                throw new Error((res as { message?: string }).message ?? unknownErrorLabel);
            }
        } catch (err: unknown) {
            setToast({
                type: 'error',
                msg: (err as Error)?.message ?? invalidAmountLabel,
            });
        } finally {
            setSubmitting(false);
        }
    }, [
        amountInput,
        invalidAmountLabel,
        maxRefundable,
        method,
        onClose,
        onSuccess,
        orderId,
        reason,
        resolveErrorMessage,
        refundType,
        successInitiatedLabel,
        unknownErrorLabel,
    ]);

    const confirmAmount = refundType === 'FULL' ? maxRefundable : Number(amountInput);
    const submitLabel = resolveText('refund.form.submit', 'Xác nhận hoàn tiền {{amount}}', {
        amount: formatCurrencyFullVND(confirmAmount),
    });

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AdminModalShell
            icon={BadgeDollarSign}
            title={titleLabel}
            subtitle={subtitleLabel}
            onClose={onClose}
            maxWidthClassName="max-w-lg"
            panelClassName="rounded-2xl"
            bodyClassName="max-h-[70vh] overflow-y-auto space-y-5 px-6 py-5"
            footer={(
                <div className="flex gap-3">
                    <AdminSecondaryButton
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 rounded-xl px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                    >
                        {cancelLabel}
                    </AdminSecondaryButton>
                    {maxRefundable > 0 && (
                        <AdminPrimaryButton
                            onClick={handleSubmit}
                            disabled={submitting || confirmAmount <= 0}
                            className="flex-1 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-primary shadow-none hover:bg-primary/20"
                        >
                            {submitting ? (
                                <><Loader2 size={13} className="animate-spin" />{submittingLabel}</>
                            ) : (
                                resolveText('refund.form.submit', submitLabel, { amount: formatCurrencyFullVND(confirmAmount) })
                            )}
                        </AdminPrimaryButton>
                    )}
                </div>
            )}
        >

                    {/* ── Financial stats ──────────────────────────────────────── */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: totalPaidLabel, value: formatCurrencyFullVND(totalPaid), color: 'text-white' },
                            { label: totalRefundedLabel, value: formatCurrencyFullVND(totalRefunded), color: 'text-amber-400' },
                            { label: maxRefundableLabel, value: formatCurrencyFullVND(maxRefundable), color: 'text-emerald-400' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-3 text-center">
                                <p className="text-[9px] uppercase tracking-wider text-white/35 mb-1">{label}</p>
                                <p className={`text-[13px] font-bold ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Guard: nothing to refund */}
                    {maxRefundable <= 0 && (
                        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm">
                            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                            <p className="text-[12px] text-amber-300">
                                {alreadyFullyRefundedLabel}
                            </p>
                        </div>
                    )}

                    {maxRefundable > 0 && (
                        <>
                            {/* ── Refund type ──────────────────────────────────────── */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {refundTypeLabel}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['FULL', 'PARTIAL'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setRefundType(type)}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-sm border text-[12px] font-semibold transition-colors cursor-pointer ${refundType === type
                                                ? 'bg-primary/10 border-primary/40 text-primary'
                                                : 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:border-white/15'
                                                }`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${refundType === type ? 'border-primary' : 'border-white/20'}`}>
                                                {refundType === type && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </span>
                                            {type === 'FULL' ? typeFullLabel : typePartialLabel}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Amount (Partial only) ─────────────────────────────── */}
                            {refundType === 'PARTIAL' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        {amountLabel} <span className="text-primary">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={1}
                                            max={maxRefundable}
                                            value={amountInput}
                                            onChange={e => handleAmountChange(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary/40 transition-colors placeholder-white/20 pr-16"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-[11px] font-bold">₫</span>
                                    </div>
                                    {Number(amountInput) > 0 && (
                                        <p className="text-[11px] text-white/35 pl-1">{formatCurrencyFullVND(Number(amountInput))}</p>
                                    )}
                                    {errors.amount && <p className="text-[11px] text-red-400">{errors.amount}</p>}
                                </div>
                            )}

                            {/* ── Method ───────────────────────────────────────────── */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {methodLabel} <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={method}
                                        onChange={e => setMethod(e.target.value as RefundMethod)}
                                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.1] text-white text-[13px] px-4 py-3 rounded-sm focus:outline-none focus:border-primary/40 transition-colors cursor-pointer pr-10"
                                    >
                                        {REFUND_METHODS.map((val) => (
                                            <option key={val} value={val} className="bg-[#0E0E12] text-white">
                                                {refundMethodLabels[val]}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                </div>
                                {errors.method && <p className="text-[11px] text-red-400">{errors.method}</p>}
                            </div>

                            {/* ── Reason ───────────────────────────────────────────── */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {reasonLabel} <span className="text-primary">*</span>
                                </label>
                                <textarea
                                    ref={reasonRef}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder={reasonPlaceholderLabel}
                                    className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-[13px] px-4 py-3 rounded-sm focus:outline-none focus:border-primary/40 transition-colors placeholder-white/20 resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    {errors.reason
                                        ? <p className="text-[11px] text-red-400">{errors.reason}</p>
                                        : <span />}
                                    <span className="text-[10px] text-white/25 font-mono">{reason.length}/500</span>
                                </div>
                            </div>

                            {/* ── Toast inline ─────────────────────────────────────── */}
                            {toast && (
                                <div className={`flex items-center gap-3 p-3 rounded-sm border text-[12px] ${toast.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                                    }`}>
                                    {toast.type === 'success'
                                        ? <CheckCircle2 size={14} className="shrink-0" />
                                        : <AlertTriangle size={14} className="shrink-0" />}
                                    {toast.msg}
                                </div>
                            )}
                        </>
                    )}
        </AdminModalShell>
    );
};
