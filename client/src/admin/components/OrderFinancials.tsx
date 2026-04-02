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
import {
    getRefundProcessingState,
    getRemainingRefundableAmount,
    getSuccessfulRefundedAmount,
    getTotalCollectedAmount,
    normalizeRefundStatus,
    RefundFinancialSummary,
    RefundablePaymentLike,
    RefundRecord,
    RefundStatus,
} from '@/admin/services/refund.service';
import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminUiTokens } from '@/admin/components/AdminUI';
import { RefundProcessingNotice } from '@/admin/components/RefundProcessingNotice';
import { formatCurrencyFullVND } from '@/common/utils/currency';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    payments?: RefundablePaymentLike[];
    summary?: RefundFinancialSummary;
    loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderFinancials: React.FC<OrderFinancialsProps> = ({ refunds, payments = [], summary, loading }) => {
    const { t } = useTranslation(['orders']);
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const financialsTitleLabel = resolveText('refund.financials.title', 'Lịch sử tài chính');
    const transactionCountLabel = resolveText('refund.financials.transactionCount', '{{count}} giao dịch', {
        count: refunds.length,
    });
    const noTransactionsLabel = resolveText('refund.financials.noTransactions', 'Chưa có giao dịch hoàn tiền nào');
    const createdAtLabel = resolveText('refund.financials.table.createdAt', 'Ngày tạo');
    const transactionIdLabel = resolveText('refund.financials.table.transactionId', 'Mã đối soát');
    const amountHeaderLabel = resolveText('refund.financials.table.amount', 'Số tiền');
    const methodHeaderLabel = resolveText('refund.financials.table.method', 'Phương thức');
    const statusHeaderLabel = resolveText('refund.financials.table.status', 'Trạng thái');
    const fullTypeLabel = resolveText('refund.financials.typeFull', '(Toàn bộ)');
    const partialTypeLabel = resolveText('refund.financials.typePartial', '(Một phần)');
    const refundMethodLabels: Record<RefundRecord['method'], string> = {
        ORIGINAL_GATEWAY: resolveText('refund.method.ORIGINAL_GATEWAY', 'Hoàn qua cổng thanh toán gốc'),
        BANK_TRANSFER: resolveText('refund.method.BANK_TRANSFER', 'Chuyển khoản thủ công'),
        STORE_WALLET: resolveText('refund.method.STORE_WALLET', 'Ví AISTHEA'),
    };
    const refundStatusLabels: Record<RefundStatus, string> = {
        PENDING: resolveText('refund.status.PENDING', 'Chờ xử lý'),
        PROCESSING: resolveText('refund.status.PROCESSING', 'Đang xử lý'),
        SUCCESS: resolveText('refund.status.SUCCESS', 'Thành công'),
        FAILED: resolveText('refund.status.FAILED', 'Thất bại'),
    };
    const processingRefundLockedLabel = resolveText(
        'refund.warnings.processingLocked',
        'Đơn hàng này đang có một yêu cầu hoàn tiền khác đang được xử lý. Hãy chờ cổng thanh toán phản hồi hoặc cập nhật giao dịch hiện tại trước khi tạo yêu cầu mới.',
    );
    const processingRefundGatewayHintTemplate = 'Tín hiệu gần nhất từ cổng: {{message}}';
    const { processingRefund } = getRefundProcessingState(refunds);
    const totalCollectedLabel = resolveText('refund.financials.summary.totalCollected', 'Đã thu');
    const totalRefundedLabel = resolveText('refund.financials.summary.totalRefunded', 'Đã hoàn');
    const remainingRefundableLabel = resolveText('refund.financials.summary.remainingRefundable', 'Còn có thể hoàn');
    const fullyRefundedLabel = resolveText(
        'refund.financials.summary.fullyRefunded',
        'Đơn hàng này đã hoàn hết số tiền đã thu. Không còn số dư để tạo thêm giao dịch hoàn tiền.',
    );
    const totalCollected = summary?.totalCollected ?? getTotalCollectedAmount(payments);
    const totalRefunded = summary?.totalRefunded ?? getSuccessfulRefundedAmount(refunds);
    const remainingRefundable = summary?.remainingRefundable ?? getRemainingRefundableAmount(payments, refunds);

    return (
        <div className="bg-[#111318] border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Landmark size={13} className="text-primary" />
                </div>
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">
                    {financialsTitleLabel}
                </span>
                {refunds.length > 0 && (
                    <span className="ml-auto text-[10px] text-white/30 font-mono">
                        {transactionCountLabel}
                    </span>
                )}
            </div>

            {processingRefund && (
                <div className="border-b border-amber-500/15 px-5 py-3">
                    <RefundProcessingNotice
                        compact
                        message={processingRefundLockedLabel}
                        gatewayMessage={
                            processingRefund.gatewayError
                                ? resolveText('refund.warnings.processingGatewayHint', processingRefundGatewayHintTemplate, {
                                    message: processingRefund.gatewayError,
                                })
                                : undefined
                        }
                        className="border-0 bg-transparent px-0 py-0"
                    />
                </div>
            )}

            {!loading && totalCollected > 0 && (
                <div className="border-b border-white/[0.06] px-5 py-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: totalCollectedLabel, value: formatCurrencyFullVND(totalCollected), valueClassName: 'text-white' },
                            { label: totalRefundedLabel, value: formatCurrencyFullVND(totalRefunded), valueClassName: 'text-amber-400' },
                            { label: remainingRefundableLabel, value: formatCurrencyFullVND(remainingRefundable), valueClassName: 'text-emerald-400' },
                        ].map(({ label, value, valueClassName }) => (
                            <div key={label} className="rounded-sm border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                                <p className="mb-1 text-[9px] uppercase tracking-wider text-white/35">{label}</p>
                                <p className={`text-[13px] font-bold ${valueClassName}`}>{value}</p>
                            </div>
                        ))}
                    </div>
                    {remainingRefundable === 0 && (
                        <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3">
                            <p className="text-[12px] text-emerald-200">{fullyRefundedLabel}</p>
                        </div>
                    )}
                </div>
            )}

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
                    <p className="text-[12px] text-white/30">{noTransactionsLabel}</p>
                </div>
            )}

            {/* Table */}
            {!loading && refunds.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                        <thead className={adminUiTokens.tableHeaderSurface}>
                            <tr>
                                {[
                                    createdAtLabel,
                                    transactionIdLabel,
                                    amountHeaderLabel,
                                    methodHeaderLabel,
                                    statusHeaderLabel,
                                ].map((h) => (
                                    <th key={h} className={`whitespace-nowrap px-4 py-2.5 ${adminUiTokens.tableHeader}`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={adminUiTokens.tableBody}>
                            {refunds.map((r) => {
                                const normalizedStatus = normalizeRefundStatus(r.status);
                                return (
                                <tr key={r.refundId} className={adminUiTokens.tableRowSoft}>
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
                                        {formatCurrencyFullVND(r.amount)}
                                        <span className="ml-1.5 text-[10px] text-white/30">
                                            {r.type === 'FULL' ? fullTypeLabel : partialTypeLabel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-white/55 whitespace-nowrap">
                                        {refundMethodLabels[r.method]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={normalizedStatus} label={refundStatusLabels[normalizedStatus]} />
                                            {(normalizedStatus === 'FAILED' || normalizedStatus === 'PROCESSING') && r.gatewayError && (
                                                <span
                                                    className={`text-[10px] leading-tight ${
                                                        normalizedStatus === 'FAILED'
                                                            ? 'text-red-400/70'
                                                            : 'text-amber-300/80'
                                                    }`}
                                                >
                                                    {r.gatewayError}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
