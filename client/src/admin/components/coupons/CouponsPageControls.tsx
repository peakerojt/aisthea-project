import React from 'react';
import {
  Ban,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Tag,
  TicketPercent,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminRefreshButton,
  AdminStatCards,
  AdminTabs,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import type { CouponSortValue } from '@/common/services/coupon.service';

type StatTone = 'default' | 'success' | 'danger' | 'info';

interface CouponsPageControlsProps {
  isManualRefreshing: boolean;
  isRefreshing: boolean;
  loading: boolean;
  onChangePageSize: (value: number) => void;
  onChangeSearch: (value: string) => void;
  onChangeSort: (value: CouponSortValue) => void;
  onChangeStatusFilter: (value: string) => void;
  onClearSearch: () => void;
  onCreateCoupon: () => void;
  onRefresh: () => void;
  pageSize: number;
  search: string;
  sort: CouponSortValue;
  statusFilter: string;
  summaryCounts: {
    active: number;
    depleted: number;
    expired: number;
    total: number;
  };
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const CouponsPageControls: React.FC<CouponsPageControlsProps> = ({
  isManualRefreshing,
  isRefreshing,
  loading,
  onChangePageSize,
  onChangeSearch,
  onChangeSort,
  onChangeStatusFilter,
  onClearSearch,
  onCreateCoupon,
  onRefresh,
  pageSize,
  search,
  sort,
  statusFilter,
  summaryCounts,
  t,
}) => {
  const statFilters = [
    { key: 'ALL', label: t('coupons:filters.all') },
    { key: 'ACTIVE', label: t('coupons:filters.active') },
    { key: 'UPCOMING', label: t('coupons:filters.upcoming') },
    { key: 'EXPIRED', label: t('coupons:filters.expired') },
    { key: 'DEPLETED', label: t('coupons:filters.depleted') },
    { key: 'INACTIVE', label: t('coupons:filters.inactive') },
  ];

  const statsBar: Array<{ icon: LucideIcon; key: string; label: string; tone: StatTone; value: number | string; hint?: string }> = [
    { key: 'total', label: t('coupons:stats.total'), value: loading ? '–' : summaryCounts.total, icon: Tag, tone: 'default' },
    { key: 'active', label: t('coupons:stats.active'), value: loading ? '–' : summaryCounts.active, icon: CheckCircle2, tone: 'success' },
    { key: 'expired', label: t('coupons:stats.expired'), value: loading ? '–' : summaryCounts.expired, icon: Clock, tone: 'default' },
    { key: 'depleted', label: t('coupons:stats.depleted'), value: loading ? '–' : summaryCounts.depleted, icon: Ban, tone: 'danger' },
  ];

  return (
    <div className="space-y-4 border-b border-white/[0.06] p-5 lg:p-6">
      <AdminPageHeader
        icon={TicketPercent}
        title={t('coupons:page.title')}
        subtitle={t('coupons:page.subtitle')}
        actions={(
          <AdminPrimaryButton type="button" onClick={onCreateCoupon}>
            <Plus size={15} />
            {t('coupons:page.create')}
          </AdminPrimaryButton>
        )}
      />

      <AdminStatCards items={statsBar} className="gap-3" />

      <AdminToolbar
        actions={(
          <AdminRefreshButton
            type="button"
            onClick={onRefresh}
            isRefreshing={isManualRefreshing}
            disabled={loading || isRefreshing || isManualRefreshing}
            label={t('coupons:filters.refresh')}
          />
        )}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
          <input
            type="text"
            placeholder={t('coupons:filters.searchPlaceholder')}
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            className={adminUiTokens.searchFieldControl}
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
              aria-label={t('coupons:filters.clearSearch', { defaultValue: 'Xóa từ khóa tìm kiếm' })}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <label className="min-w-[220px]">
          <span className={adminUiTokens.fieldLabel}>
            {t('common:sort.label', { defaultValue: 'Sắp xếp' })}
          </span>
          <select
            value={sort}
            onChange={(event) => onChangeSort(event.target.value as CouponSortValue)}
            className={adminUiTokens.fieldControl}
          >
            <option value="createdAt_desc" className="bg-[#14161b]">
              {t('coupons:sortOptions.createdAtDesc', { defaultValue: 'Tạo gần nhất' })}
            </option>
            <option value="createdAt_asc" className="bg-[#14161b]">
              {t('coupons:sortOptions.createdAtAsc', { defaultValue: 'Tạo cũ nhất' })}
            </option>
            <option value="endDate_asc" className="bg-[#14161b]">
              {t('coupons:sortOptions.endDateAsc', { defaultValue: 'Hết hạn sớm nhất' })}
            </option>
            <option value="endDate_desc" className="bg-[#14161b]">
              {t('coupons:sortOptions.endDateDesc', { defaultValue: 'Hết hạn muộn nhất' })}
            </option>
            <option value="usedCount_desc" className="bg-[#14161b]">
              {t('coupons:sortOptions.usedCountDesc', { defaultValue: 'Dùng nhiều nhất' })}
            </option>
            <option value="usedCount_asc" className="bg-[#14161b]">
              {t('coupons:sortOptions.usedCountAsc', { defaultValue: 'Dùng ít nhất' })}
            </option>
          </select>
        </label>

        <label className="w-[120px]">
          <span className={adminUiTokens.fieldLabel}>
            {t('common:pagination.perPage', { defaultValue: '/ trang' })}
          </span>
          <select
            value={pageSize}
            onChange={(event) => onChangePageSize(Number(event.target.value))}
            className={adminUiTokens.fieldControl}
          >
            {[10, 20, 50].map((option) => (
              <option key={option} value={option} className="bg-[#14161b]">
                {option}
              </option>
            ))}
          </select>
        </label>
      </AdminToolbar>

      <AdminTabs
        items={statFilters.map((filter) => ({ key: filter.key, label: filter.label }))}
        activeKey={statusFilter}
        onChange={onChangeStatusFilter}
      />
    </div>
  );
};
