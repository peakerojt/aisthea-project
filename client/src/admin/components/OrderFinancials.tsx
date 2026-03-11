/**
 * OrderFinancials.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "Lịch sử tài chính" — Financial History card for the Admin Order Detail page.
 *
 * Displays a table of all Refund records for this order:
 *   Ngày tạo | Mã đối soát | Số tiền | Phương thức | Trạng thái
 *
 * Design system: luxury dark · primary=#E31837 · Be Vietnam Pro
 */

import React from 'react';
import { RefundRecord, RefundStatus } from '@/admin/services/refund.service';
import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (amount: string | number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));

const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));

// ─── Status badge ──────────────────────────────────────────────────────────────

const statusStyles: Record<RefundStatus, string> = {
    SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    PROCESSING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    PENDING: 'bg-white/5 text-white/40 border-white/10',
};

const StatusBadge: React.FC<{ status: RefundStatus; label: string }> = ({ status, label }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusStyles[status] ?? statusStyles.PENDING}`}>
        {label}
    </span>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderFinancialsProps {
    refunds: RefundRecord[];
    loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderFinancials: React.FC<OrderFinancialsProps> = ({ refunds, loading }) => {
    const { t } = useTranslation(['orders']);

    return (
        <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Landmark size={13} className="text-primary" />
                </div>
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                    {t('refund.financials.title')}
                </span>
                {refunds.length > 0 && (
                    <span className="ml-auto text-[10px] text-white/30 font-mono">
                        {t('refund.financials.transactionCount', { count: refunds.length })}
                    </span>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="px-5 py-8 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-primary animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && refunds.length === 0 && (
                <div className="px-5 py-8 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <Landmark size={18} className="text-white/20" />
                    </div>
                    <p className="text-[12px] text-white/30">{t('refund.financials.noTransactions')}</p>
                </div>
            )}

            {/* Table */}
            {!loading && refunds.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                        <thead>
                            <tr className="border-b border-white/[0.04]">
                                {[
                                    t('refund.financials.table.createdAt'),
                                    t('refund.financials.table.transactionId'),
                                    t('refund.financials.table.amount'),
                                    t('refund.financials.table.method'),
                                    t('refund.financials.table.status')
                                ].map((h) => (
                                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/30 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {refunds.map((r) => (
                                <tr key={r.refundId} className="hover:bg-white/[0.015] transition-colors">
                                    <td className="px-4 py-3 text-white/50 font-mono whitespace-nowrap">
                                        {formatDate(r.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.gatewayTransactionId ? (
                                            <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[140px] block">
                                                {r.gatewayTransactionId}
                                            </span>
                                        ) : (
                                            <span className="text-white/25">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                                        {formatVND(r.amount)}
                                        <span className="ml-1.5 text-[10px] text-white/30">
                                            {r.type === 'FULL' ? t('refund.financials.typeFull') : t('refund.financials.typePartial')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-white/55 whitespace-nowrap">
                                        {t(`refund.method.${r.method}`)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={r.status} label={t(`refund.status.${r.status}`)} />
                                            {r.status === 'FAILED' && r.gatewayError && (
                                                <span className="text-[10px] text-red-400/70 leading-tight">
                                                    {r.gatewayError}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
