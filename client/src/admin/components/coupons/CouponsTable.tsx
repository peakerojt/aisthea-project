import React from 'react';
import { AlertTriangle, Ban, CalendarRange, CheckCircle2, Clock, Pencil, TicketPercent, Trash2, type LucideIcon } from 'lucide-react';
import {
  AdminBadge,
  AdminRowIconButton,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import type { Coupon } from '@/common/services/coupon.service';

const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  ACTIVE: CheckCircle2,
  DEPLETED: Ban,
  EXPIRED: Clock,
  INACTIVE: Ban,
  UPCOMING: CalendarRange,
};

const getStatusBadgeTone = (status: string) => {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'DEPLETED') return 'danger' as const;
  if (status === 'UPCOMING') return 'info' as const;
  if (status === 'INACTIVE') return 'default' as const;
  return 'warning' as const;
};

interface CouponsTableProps {
  coupons: Coupon[];
  error: string | null;
  formatCurrency: (value: number) => string;
  formatDate: (iso: string) => string;
  loading: boolean;
  onClearFilters: () => void;
  onDelete: (coupon: Coupon) => void;
  onEdit: (coupon: Coupon) => void;
  onRetry: () => void;
  search: string;
  statusFilter: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

const SkeletonRow: React.FC = () => (
  <tr className="border-b border-white/[0.04]">
    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
      <td key={i} className="px-5 py-4">
        <div
          className="h-3.5 animate-pulse rounded bg-white/[0.05]"
          style={{ width: `${45 + i * 8}%` }}
        />
      </td>
    ))}
  </tr>
);

export const CouponsTable: React.FC<CouponsTableProps> = ({
  coupons,
  error,
  formatCurrency,
  formatDate,
  loading,
  onClearFilters,
  onDelete,
  onEdit,
  onRetry,
  search,
  statusFilter,
  t,
}) => {
  const isCouponEditLocked = (coupon: Coupon) => coupon.status === 'INACTIVE' || coupon.status === 'EXPIRED';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle size={40} className="mb-4 text-red-400" />
        <p className="mb-6 font-medium text-white/60">{error}</p>
        <button
          onClick={onRetry}
          className="rounded-lg border border-primary/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10"
        >
          {t('coupons:feedback.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-h-[68vh] overflow-auto">
      <table className="min-w-[1160px] w-full border-collapse text-left">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[17%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[16%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead className={`sticky top-0 z-10 bg-[#111318] ${adminUiTokens.tableHeaderSurface}`}>
          <tr>
            <th className={`sticky left-0 z-20 bg-[#111318] px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.code')}</th>
            <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.type')}</th>
            <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.condition')}</th>
            <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.period')}</th>
            <th className={`px-4 py-3.5 text-center ${adminUiTokens.tableHeader}`}>{t('coupons:table.usage')}</th>
            <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.status')}</th>
            <th className={`sticky right-0 z-20 bg-[#111318] px-4 py-3.5 text-center ${adminUiTokens.tableHeader}`}>{t('coupons:table.actions')}</th>
          </tr>
        </thead>
        <tbody className={adminUiTokens.tableBody}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : coupons.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <TicketPercent size={48} className="mb-4 text-white/10" />
                  <p className="text-sm font-medium text-white/40">
                    {search || statusFilter !== 'ALL' ? t('coupons:table.noMatch') : t('coupons:table.noData')}
                  </p>
                  {(search || statusFilter !== 'ALL') && (
                    <button
                      onClick={onClearFilters}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      {t('coupons:table.clearFilter')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            coupons.map((c) => {
              const statusLabel = t(`coupons:status.${c.status}`) || c.status;
              const StatusIcon = STATUS_ICON_MAP[c.status] ?? Ban;
              const usagePct = c.usageLimit > 0 ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 0;
              const editLocked = isCouponEditLocked(c);
              const editTitle = editLocked
                ? c.status === 'INACTIVE'
                  ? 'Mã giảm giá vô hiệu không thể chỉnh sửa'
                  : 'Mã giảm giá đã hết hạn không thể chỉnh sửa'
                : t('coupons:form.titleEdit');

              return (
                <tr key={c.couponId} className={adminUiTokens.tableRowSoft}>
                  <td className="sticky left-0 z-[1] bg-[#111318] px-4 py-4">
                    <div>
                      <code className="inline-flex rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-white">
                        {c.code}
                      </code>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {c.type === 'FIXED_AMOUNT' ? formatCurrency(c.value) : `${c.value}%`}
                      </p>
                      {c.type === 'PERCENTAGE' && c.maxDiscountAmount ? (
                        <p className="mt-1 text-[11px] text-white/50">
                          Tối đa{' '}
                          <span className="font-medium text-white/72">
                            {formatCurrency(c.maxDiscountAmount)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div>
                      <p className="text-xs text-white/60">
                        Đơn tối thiểu:{' '}
                        <span className="font-semibold text-white">
                          {c.minOrderValue > 0 ? formatCurrency(c.minOrderValue) : t('coupons:common.unlimited')}
                        </span>
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-white/60">
                        Từ <span className="font-medium text-white/72">{formatDate(c.startDate)}</span>
                      </p>
                      <p className="text-[11px] text-white/30">
                        Đến <span className="font-medium text-white/58">{formatDate(c.endDate)}</span>
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="tabular-nums text-sm font-bold text-white">
                        {c.usedCount}
                        <span className="font-normal text-white/30">/{c.usageLimit}</span>
                      </span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                      <div
                          className={`h-full rounded-full transition-colors ${
                            usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div>
                      <AdminBadge
                        tone={getStatusBadgeTone(c.status)}
                        className="w-fit whitespace-nowrap px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                      >
                        <StatusIcon size={10} />
                        {statusLabel}
                      </AdminBadge>
                    </div>
                  </td>

                  <td className="sticky right-0 z-[1] bg-[#111318] px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <AdminRowIconButton
                        onClick={() => onEdit(c)}
                        title={editTitle}
                        disabled={editLocked}
                        tone="primary"
                      >
                        <Pencil size={14} />
                      </AdminRowIconButton>
                      <AdminRowIconButton
                        onClick={() => onDelete(c)}
                        title={t('coupons:delete.action')}
                        disabled={!c.isActive}
                        tone="danger"
                      >
                        <Trash2 size={14} />
                      </AdminRowIconButton>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
