import React from 'react';
import { ClipboardList, Search, X } from 'lucide-react';
import {
  AdminBadge,
  AdminPageHeader,
  AdminStatCards,
  AdminStatusFilterBar,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import type { ReturnSortValue, ReturnStatusFilter } from '@/admin/hooks/useReturns';

type StatusTab = {
  key: string;
  label: React.ReactNode;
  count?: number;
};

interface ReturnsPageControlsProps {
  changePageSize: (nextPageSize: number) => void;
  changeSearch: (nextSearch: string) => void;
  changeSort: (nextSort: ReturnSortValue) => void;
  changeStatusFilter: (nextFilter: ReturnStatusFilter) => void;
  isRefreshing: boolean;
  loading: boolean;
  pageSize: number;
  pageSizeLabel: string;
  pageSizeOptions: readonly number[];
  pendingBadgeLabel: string;
  pendingCount: number;
  refreshLabel: string;
  search: string;
  searchPlaceholderLabel: string;
  sort: ReturnSortValue;
  sortLabel: string;
  sortOptions: Array<{ value: ReturnSortValue; label: string }>;
  statusFilter: ReturnStatusFilter;
  statusTabs: StatusTab[];
  subtitleLabel: string;
  titleLabel: string;
}

export const ReturnsPageControls: React.FC<ReturnsPageControlsProps> = ({
  changePageSize,
  changeSearch,
  changeSort,
  changeStatusFilter,
  isRefreshing,
  loading,
  pageSize,
  pageSizeLabel,
  pageSizeOptions,
  pendingBadgeLabel,
  pendingCount,
  refreshLabel,
  search,
  searchPlaceholderLabel,
  sort,
  sortLabel,
  sortOptions,
  statusFilter,
  statusTabs,
  subtitleLabel,
  titleLabel,
}) => {
  const totalCount = statusTabs.find((tab) => tab.key === 'ALL')?.count;
  const activeTab = statusTabs.find((tab) => tab.key === statusFilter);
  const activeFilterLabel = typeof activeTab?.label === 'string' ? activeTab.label : statusFilter;

  return (
    <div className="space-y-4 border-b border-white/[0.06] p-5 lg:p-6">
      <AdminPageHeader
        icon={ClipboardList}
        title={titleLabel}
        subtitle={subtitleLabel}
        actions={pendingCount > 0 ? (
          <AdminBadge tone="warning" dot className="px-4 py-2 text-sm uppercase tracking-[0.14em]">
            {pendingBadgeLabel}
          </AdminBadge>
        ) : undefined}
      />

      <AdminStatCards
        items={[
          {
            key: 'all',
            label: 'Tổng yêu cầu',
            value: loading ? '—' : totalCount ?? '—',
            hint: statusFilter === 'ALL' ? undefined : activeFilterLabel,
            tone: 'default',
            variant: 'compact',
            icon: ClipboardList,
          },
          {
            key: 'pending',
            label: 'Cần xử lý',
            value: loading ? '—' : pendingCount,
            tone: pendingCount > 0 ? 'warning' : 'success',
            variant: 'compact',
            icon: ClipboardList,
          },
        ]}
      />

      <AdminToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
          <input
            type="text"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={searchPlaceholderLabel}
            className={adminUiTokens.searchFieldControl}
          />
          {search && (
            <button
              type="button"
              onClick={() => changeSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
              aria-label="Clear return search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <label className="min-w-[220px]">
          <span className={adminUiTokens.fieldLabel}>{sortLabel}</span>
          <select
            value={sort}
            onChange={(event) => changeSort(event.target.value as ReturnSortValue)}
            className={adminUiTokens.fieldControl}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#14161b]">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="w-[120px]">
          <span className={adminUiTokens.fieldLabel}>{pageSizeLabel}</span>
          <select
            value={pageSize}
            onChange={(event) => changePageSize(Number(event.target.value))}
            className={adminUiTokens.fieldControl}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option} className="bg-[#14161b]">
                {option}
              </option>
            ))}
          </select>
        </label>
      </AdminToolbar>

      <AdminStatusFilterBar
        items={statusTabs}
        activeKey={statusFilter}
        onChange={(key) => changeStatusFilter(key as ReturnStatusFilter)}
        isRefreshing={isRefreshing && !loading}
        refreshLabel={refreshLabel}
        tabsClassName="gap-2.5 [&_button]:px-4 [&_button]:py-2 [&_button]:text-[15px] [&_button]:font-semibold [&_button]:text-white/58 [&_button]:shadow-none [&_button>span:last-child]:px-1.5 [&_button>span:last-child]:py-0.5 [&_button>span:last-child]:text-[10px] [&_[data-admin-tab-active='true']]:border-primary/35 [&_[data-admin-tab-active='true']]:bg-primary/10 [&_[data-admin-tab-active='true']]:text-white [&_[data-admin-tab-active='false']]:border-white/[0.08] [&_[data-admin-tab-active='false']]:bg-white/[0.025]"
      />
    </div>
  );
};
