import React, { Suspense, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from '@/admin/components/AdminUI';
import { ReturnsPageControls } from '@/admin/components/returns/ReturnsPageControls';
import { ReturnsPagination } from '@/admin/components/returns/ReturnsPagination';
import { ReturnsTable } from '@/admin/components/returns/ReturnsTable';
import {
  DEFAULT_RETURN_PAGE_SIZE,
  DEFAULT_RETURN_SORT,
  RETURN_PAGE_SIZE_OPTIONS,
  type ReturnSortValue,
  ReturnStatusFilter,
  useAdminReturns,
} from '@/admin/hooks/useReturns';

const loadAdminReturnReviewModal = () =>
  import('@/admin/components/AdminReturnReviewModal').then((module) => ({
    default: module.AdminReturnReviewModal,
  }));

const LazyAdminReturnReviewModal = React.lazy(loadAdminReturnReviewModal);

const RETURN_STATUS_QUERY_VALUES = new Set<ReturnStatusFilter>(['ALL', 'REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED']);
const RETURN_SORT_QUERY_VALUES = new Set<ReturnSortValue>([
  'createdAt_desc',
  'createdAt_asc',
  'updatedAt_desc',
  'updatedAt_asc',
  'refundStatus_asc',
]);

const parseReturnStatusFilter = (value: string | null): ReturnStatusFilter =>
  value && RETURN_STATUS_QUERY_VALUES.has(value as ReturnStatusFilter)
    ? (value as ReturnStatusFilter)
    : 'ALL';

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseReturnSort = (value: string | null): ReturnSortValue =>
  value && RETURN_SORT_QUERY_VALUES.has(value as ReturnSortValue)
    ? (value as ReturnSortValue)
    : DEFAULT_RETURN_SORT;

const ReturnsDetailFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0b0c] p-6 shadow-2xl shadow-black/35">
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-24 rounded-2xl bg-white/[0.05]" />
          <div className="h-24 rounded-2xl bg-white/[0.05]" />
        </div>
        <div className="h-36 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  </div>
);

export const Returns: React.FC = () => {
  const [expandedReturnIds, setExpandedReturnIds] = useState<Set<number>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatusFilter = parseReturnStatusFilter(searchParams.get('status'));
  const initialSearch = searchParams.get('q') ?? '';
  const initialSort = parseReturnSort(searchParams.get('sort'));
  const initialPage = parsePositiveInt(searchParams.get('page'), 1);
  const initialPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_RETURN_PAGE_SIZE);
  const {
    canManageRefundWorkflow,
    canManageReturnWorkflow,
    changePageSize,
    changeSearch,
    changeSort,
    changeStatusFilter,
    isRefreshing,
    loading,
    page,
    pageSize,
    pendingCount,
    reviewActions,
    returns,
    search,
    selectedReturn,
    setPage,
    setSelectedReturn,
    sort,
    statusFilter,
    statusTabs,
    totalPages,
    t,
  } = useAdminReturns({
    initialStatusFilter,
    initialSearch,
    initialSort,
    initialPage,
    initialPageSize,
  });

  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };

  const titleLabel = resolveText('page.title', 'Quản lý trả hàng');
  const subtitleLabel = resolveText('page.subtitle', 'Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền');
  const pendingBadgeLabel = resolveText('page.pendingBadge', '{{count}} chờ duyệt', { count: pendingCount });
  const searchPlaceholderLabel = resolveText('filters.searchPlaceholderAdmin', 'Tìm mã đơn, khách hàng, email...');
  const sortLabel = resolveText('filters.sortLabel', 'Sắp xếp');
  const perPageLabel = resolveText('pagination.perPage', '/ trang');
  const emptyLabel = resolveText('table.empty', 'Không có yêu cầu trả hàng nào.');
  const orderCustomerLabel = resolveText('table.orderCustomer', 'Mã đơn / Khách hàng');
  const reasonLabel = resolveText('table.reason', 'Lý do');
  const requestDateLabel = resolveText('table.requestDate', 'Ngày yêu cầu');
  const statusLabel = resolveText('table.status', 'Trạng thái');
  const refundAmountLabel = resolveText('table.expectedRefund', 'Hoàn tiền dự kiến');
  const actionsLabel = resolveText('table.actions', 'Thao tác');
  const financeNoteLabel = resolveText('table.financeNote', 'Ghi chú tài chính');
  const financeNoteMetaLabel = (date: string, actor: string) =>
    resolveText('table.financeNoteMeta', 'Cập nhật {{date}} · {{actor}}', { date, actor });
  const guestLabel = resolveText('table.guest', 'Khách vãng lai');
  const viewDetailLabel = resolveText('table.viewDetail', 'Xem chi tiết');
  const showMoreLabel = resolveText('table.showMore', 'Xem thêm thông tin hoàn trả');
  const hideMoreLabel = resolveText('table.hideMore', 'Ẩn thông tin hoàn trả');
  const previousLabel = resolveText('pagination.previous', 'Trước');
  const nextLabel = resolveText('pagination.next', 'Sau');
  const pageLabel = resolveText('pagination.page', 'Trang {{page}} / {{total}}', { page, total: totalPages });
  const refundStatusDetailLabel = resolveText('table.refundStatusDetail', 'Trạng thái hoàn tiền');
  const activeTab = statusTabs.find((tab) => tab.key === statusFilter);
  const activeFilterLabel = typeof activeTab?.label === 'string' ? activeTab.label : statusFilter;
  const hasSearch = search.trim().length > 0;
  const hasScopedFilter = statusFilter !== 'ALL';
  const emptyStateTitle = hasSearch
    ? resolveText('table.emptySearch', 'Không tìm thấy yêu cầu phù hợp.')
    : hasScopedFilter
      ? resolveText('table.emptyByStatus', 'Không có yêu cầu ở trạng thái {{status}}.', { status: activeFilterLabel })
      : emptyLabel;
  const emptyStateDescription = hasSearch
    ? undefined
    : hasScopedFilter
      ? undefined
      : subtitleLabel;
  const sortOptions = React.useMemo<Array<{ value: ReturnSortValue; label: string }>>(() => ([
    { value: 'createdAt_desc', label: resolveText('sortOptions.createdAtDesc', 'Yêu cầu mới nhất') },
    { value: 'createdAt_asc', label: resolveText('sortOptions.createdAtAsc', 'Yêu cầu cũ nhất') },
    { value: 'updatedAt_desc', label: resolveText('sortOptions.updatedAtDesc', 'Cập nhật gần nhất') },
    { value: 'updatedAt_asc', label: resolveText('sortOptions.updatedAtAsc', 'Cập nhật cũ nhất') },
    { value: 'refundStatus_asc', label: resolveText('sortOptions.refundStatusAsc', 'Theo trạng thái hoàn tiền') },
  ]), [resolveText]);

  const toggleExpandedReturn = (returnId: number) => {
    setExpandedReturnIds((current) => {
      const next = new Set(current);
      if (next.has(returnId)) {
        next.delete(returnId);
      } else {
        next.add(returnId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (statusFilter !== 'ALL') {
      nextSearchParams.set('status', statusFilter);
    }
    if (search.trim()) {
      nextSearchParams.set('q', search.trim());
    }
    if (sort !== DEFAULT_RETURN_SORT) {
      nextSearchParams.set('sort', sort);
    }
    if (page > 1) {
      nextSearchParams.set('page', page.toString());
    }
    if (pageSize !== DEFAULT_RETURN_PAGE_SIZE) {
      nextSearchParams.set('pageSize', pageSize.toString());
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
  }, [page, pageSize, search, searchParams, setSearchParams, sort, statusFilter]);

  return (
    <AdminPageShell className="min-h-screen bg-bg-dark text-white">
      <AdminSectionCard className="overflow-hidden" bodyClassName="h-full">
        <ReturnsPageControls
          changePageSize={changePageSize}
          changeSearch={changeSearch}
          changeSort={changeSort}
          changeStatusFilter={changeStatusFilter}
          isRefreshing={isRefreshing}
          loading={loading}
          pageSize={pageSize}
          pageSizeLabel={perPageLabel}
          pageSizeOptions={RETURN_PAGE_SIZE_OPTIONS}
          pendingBadgeLabel={pendingBadgeLabel}
          pendingCount={pendingCount}
          refreshLabel={resolveText('page.refreshing', 'Đang cập nhật')}
          search={search}
          searchPlaceholderLabel={searchPlaceholderLabel}
          sort={sort}
          sortLabel={sortLabel}
          sortOptions={sortOptions}
          statusFilter={statusFilter}
          statusTabs={statusTabs}
          subtitleLabel={subtitleLabel}
          titleLabel={titleLabel}
        />

        {loading ? (
          <div className="space-y-3 p-8 animate-pulse">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-14 rounded bg-white/5" />
            ))}
          </div>
        ) : returns.length === 0 ? (
          <AdminEmptyState
            icon={ClipboardList}
            title={emptyStateTitle}
            description={emptyStateDescription}
            action={(hasSearch || hasScopedFilter) ? (
              <button
                type="button"
                onClick={() => {
                  if (hasSearch) changeSearch('');
                  if (hasScopedFilter) changeStatusFilter('ALL');
                }}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                {resolveText('table.clearFilters', 'Xóa bộ lọc')}
              </button>
            ) : undefined}
          />
        ) : (
          <ReturnsTable
            actionsLabel={actionsLabel}
            expandedReturnIds={expandedReturnIds}
            financeNoteLabel={financeNoteLabel}
            financeNoteMetaLabel={financeNoteMetaLabel}
            guestLabel={guestLabel}
            hideMoreLabel={hideMoreLabel}
            onSelectReturn={setSelectedReturn}
            onToggleExpandedReturn={toggleExpandedReturn}
            orderCustomerLabel={orderCustomerLabel}
            reasonLabel={reasonLabel}
            refundAmountLabel={refundAmountLabel}
            refundStatusDetailLabel={refundStatusDetailLabel}
            requestDateLabel={requestDateLabel}
            resolveText={resolveText}
            returns={returns}
            showMoreLabel={showMoreLabel}
            statusLabel={statusLabel}
            t={t}
            viewDetailLabel={viewDetailLabel}
          />
        )}

        <ReturnsPagination
          nextLabel={nextLabel}
          onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
          onPrevious={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          page={page}
          pageLabel={pageLabel}
          previousLabel={previousLabel}
          totalPages={totalPages}
        />
      </AdminSectionCard>

      {selectedReturn && (
        <Suspense fallback={<ReturnsDetailFallback />}>
          <LazyAdminReturnReviewModal
            actions={reviewActions}
            canManageRefundWorkflow={canManageRefundWorkflow}
            canManageReturnWorkflow={canManageReturnWorkflow}
            item={selectedReturn}
            onClose={() => setSelectedReturn(null)}
          />
        </Suspense>
      )}
    </AdminPageShell>
  );
};
