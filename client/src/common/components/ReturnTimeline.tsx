import React from 'react';
import {
  ArrowUpRight,
  CheckCheck,
  CircleX,
  Landmark,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Search,
  Truck,
  Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ReturnStatusPill } from '@/common/components/ReturnStatusPill';
import type { RawReturnWorkflowStatus } from '@/common/services/return.types';
import {
  canonicalizeWorkflowStatusFallback,
  normalizeWorkflowStatusValue,
} from '@/common/utils/returnStatus';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

interface Log {
  logId: number;
  fromStatus?: RawReturnWorkflowStatus | null;
  toStatus: RawReturnWorkflowStatus;
  fromWorkflowStatus?: RawReturnWorkflowStatus | null;
  toWorkflowStatus?: RawReturnWorkflowStatus;
  comment?: string | null;
  createdAt: string;
  changedByUser?: { fullName?: string | null } | null;
}

const surfaceClassName = 'rounded-2xl border border-white/10 bg-white/[0.03]';
const itemClassName = 'rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  REQUESTED: ArrowUpRight,
  SUBMITTED: ArrowUpRight,
  PENDING_PAYMENT_CONFIRMATION: ArrowUpRight,
  PENDING_ADMIN_REVIEW: ArrowUpRight,
  APPROVED: CheckCheck,
  IN_RETURN_TRANSIT: Truck,
  REJECTED: CircleX,
  RECEIVED: PackageCheck,
  RECEIVED_AND_INSPECTING: Search,
  ACCEPTED_FOR_REFUND: ReceiptText,
  REFUNDED: Wallet,
  CLOSED: LockKeyhole,
};

export function ReturnTimeline({ logs }: { logs: Log[] }) {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };

  if (!logs.length) {
    return (
      <div className={`${surfaceClassName} px-4 py-4 text-sm italic text-white/58`}>
        {resolveText('timeline.empty', 'Chưa có lịch sử trạng thái.')}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => {
        const toWorkflowStatus = log.toWorkflowStatus
          ? canonicalizeWorkflowStatusFallback(log.toWorkflowStatus)
          : canonicalizeWorkflowStatusFallback(log.toStatus);
        const toStatus = normalizeWorkflowStatusValue(log.toStatus);
        const isFinanceUpdate =
          (log.fromWorkflowStatus
            ? canonicalizeWorkflowStatusFallback(log.fromWorkflowStatus)
            : canonicalizeWorkflowStatusFallback(log.fromStatus ?? '')) === 'ACCEPTED_FOR_REFUND' &&
          toWorkflowStatus === 'ACCEPTED_FOR_REFUND';
        const displayComment = translateLegacyReturnCopy(log.comment, resolveText);
        const financeUpdateLabel = isFinanceUpdate
          ? resolveText('timeline.financeUpdate', 'Bộ phận hoàn tiền đã cập nhật')
          : null;
        const TimelineIcon = isFinanceUpdate
          ? Landmark
          : ICONS[toWorkflowStatus] ?? ICONS[toStatus] ?? RefreshCcw;

        return (
          <li key={log.logId} className={itemClassName}>
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#17191c] text-white/68 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
                <TimelineIcon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <ReturnStatusPill status={toWorkflowStatus} />
                  </div>
                  <span className="shrink-0 text-[11px] leading-5 text-white/32">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {financeUpdateLabel && (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/90">
                    {financeUpdateLabel}
                  </p>
                )}

                {displayComment && (
                  <p className="text-sm font-medium leading-6 text-white/84">{displayComment}</p>
                )}

                {log.changedByUser?.fullName && (
                  <p className="text-xs leading-5 text-white/50">
                    {resolveText('timeline.changedBy', 'bởi {{name}}', {
                      name: log.changedByUser.fullName,
                    })}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
