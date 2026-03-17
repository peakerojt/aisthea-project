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
    RefundMethod,
    RefundRecord,
    RefundRequestSchema,
    REFUND_METHODS,
} from '@/admin/services/refund.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (n: number): string =>
    new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

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

    // ── Derived financial state ───────────────────────────────────────────────
    const totalRefunded = existingRefunds
        .filter(r => r.status === 'SUCCESS')
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

    // ── Close on backdrop click ───────────────────────────────────────────────
    const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
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
                fieldErrors[field] = t(e.message);
            });
            setErrors(fieldErrors);
            return;
        }

        if (amount > maxRefundable) {
            setErrors({ amount: t('refund.errors.invalidAmountOrExceeds') });
            return;
        }

        setSubmitting(true);
        try {
            const res = await adminRefundService.create(orderId, parsed.data);
            if (res.success && res.data) {
                setToast({ type: 'success', msg: t('refund.success.initiated') });
                setTimeout(() => {
                    onSuccess(res.data!);
                    onClose();
                }, 1500);
            } else {
                throw new Error((res as { message?: string }).message ?? t('refund.errors.unknownError'));
            }
        } catch (err: unknown) {
            setToast({
                type: 'error',
                msg: (err as Error)?.message ?? t('refund.errors.invalidAmountOrExceeds'),
            });
        } finally {
            setSubmitting(false);
        }
    }, [orderId, refundType, method, amountInput, reason, maxRefundable, onSuccess, onClose]);

    const confirmAmount = refundType === 'FULL' ? maxRefundable : Number(amountInput);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div onClick={handleBackdrop}>
            <AdminModalShell
                icon={BadgeDollarSign}
                title={t('refund.title')}
                subtitle={t('refund.orderRef', { id: orderId })}
                onClose={onClose}
                maxWidthClassName="max-w-lg"
                panelClassName="rounded-sm border-white/[0.08] bg-[#0E0E12]"
                bodyClassName="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5"
                footer={(
                    <div className="flex gap-3">
                        <AdminSecondaryButton
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 rounded-sm px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                        >
                            {t('refund.form.cancel')}
                        </AdminSecondaryButton>
                        {maxRefundable > 0 && (
                            <AdminPrimaryButton
                                onClick={handleSubmit}
                                disabled={submitting || confirmAmount <= 0}
                                className="flex-1 rounded-sm border border-primary/30 bg-primary/10 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-primary shadow-none hover:bg-primary/20"
                            >
                                {submitting ? (
                                    <><Loader2 size={13} className="animate-spin" />{t('refund.form.submitting')}</>
                                ) : (
                                    t('refund.form.submit', { amount: formatVND(confirmAmount) })
                                )}
                            </AdminPrimaryButton>
                        )}
                    </div>
                )}
            >

                    {/* ── Financial stats ──────────────────────────────────────── */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: t('refund.stats.totalPaid'), value: formatVND(totalPaid), color: 'text-white' },
                            { label: t('refund.stats.totalRefunded'), value: formatVND(totalRefunded), color: 'text-amber-400' },
                            { label: t('refund.stats.maxRefundable'), value: formatVND(maxRefundable), color: 'text-emerald-400' },
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
                                {t('refund.stats.alreadyFullyRefunded')}
                            </p>
                        </div>
                    )}

                    {maxRefundable > 0 && (
                        <>
                            {/* ── Refund type ──────────────────────────────────────── */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {t('refund.form.refundType')}
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
                                            {type === 'FULL' ? t('refund.form.typeFull') : t('refund.form.typePartial')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Amount (Partial only) ─────────────────────────────── */}
                            {refundType === 'PARTIAL' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        {t('refund.form.amount')} <span className="text-primary">*</span>
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
                                        <p className="text-[11px] text-white/35 pl-1">{formatVND(Number(amountInput))}</p>
                                    )}
                                    {errors.amount && <p className="text-[11px] text-red-400">{errors.amount}</p>}
                                </div>
                            )}

                            {/* ── Method ───────────────────────────────────────────── */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    {t('refund.form.method')} <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={method}
                                        onChange={e => setMethod(e.target.value as RefundMethod)}
                                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.1] text-white text-[13px] px-4 py-3 rounded-sm focus:outline-none focus:border-primary/40 transition-colors cursor-pointer pr-10"
                                    >
                                        {REFUND_METHODS.map((val) => (
                                            <option key={val} value={val} className="bg-[#0E0E12] text-white">
                                                {t(`refund.method.${val}`)}
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
                                    {t('refund.form.reason')} <span className="text-primary">*</span>
                                </label>
                                <textarea
                                    ref={reasonRef}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder={t('refund.form.reasonPlaceholder')}
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
        </div>
    );
};
