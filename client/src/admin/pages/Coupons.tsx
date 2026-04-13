import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/common/contexts/ToastContext';
import {
  AdminPageShell,
  AdminSectionCard,
} from '@/admin/components/AdminUI';
import {
  fetchCoupons,
  deleteCoupon,
  type Coupon,
  type CouponSortValue,
} from '@/common/services/coupon.service';
import { CouponsPageControls } from '@/admin/components/coupons/CouponsPageControls';
import { CouponsPagination } from '@/admin/components/coupons/CouponsPagination';
import { CouponsTable } from '@/admin/components/coupons/CouponsTable';

const loadCouponDialog = () =>
  import('@/admin/components/coupons/CouponDialog').then((module) => ({
    default: module.CouponDialog,
  }));

const loadCouponDeleteDialog = () =>
  import('@/admin/components/coupons/CouponDeleteDialog').then((module) => ({
    default: module.CouponDeleteDialog,
  }));

const LazyCouponDialog = React.lazy(loadCouponDialog);
const LazyCouponDeleteDialog = React.lazy(loadCouponDeleteDialog);

function fmtCurrency(value: number): string {
  return value.toLocaleString('vi-VN') + '₫';
}

function normalizeCurrencyInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function fmtCurrencyInput(value: string): string {
  const normalized = normalizeCurrencyInput(value);
  if (!normalized) return '';
  return Number(normalized).toLocaleString('vi-VN');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toInputDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AISTHEA-${suffix}`;
}

function isCouponEditLocked(coupon: Coupon): boolean {
  return coupon.status === 'INACTIVE' || coupon.status === 'EXPIRED';
}

const CouponDialogFallback: React.FC<{ tone?: 'default' | 'danger' }> = ({ tone = 'default' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
    <div className={`w-full rounded-3xl border bg-[#0b0b0c] p-6 shadow-2xl shadow-black/35 ${
      tone === 'danger' ? 'max-w-sm border-red-500/20' : 'max-w-2xl border-white/10'
    }`}
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-24 rounded-2xl bg-white/[0.05]" />
          <div className="h-24 rounded-2xl bg-white/[0.05]" />
        </div>
        <div className="h-28 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  </div>
);

export const Coupons: React.FC = () => {
  const { t } = useTranslation();
  const { showToast: fireToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsePositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const parseCouponSort = (value: string | null): CouponSortValue => {
    const validSorts = new Set<CouponSortValue>([
      'createdAt_desc',
      'createdAt_asc',
      'endDate_asc',
      'endDate_desc',
      'usedCount_desc',
      'usedCount_asc',
    ]);
    return value && validSorts.has(value as CouponSortValue)
      ? (value as CouponSortValue)
      : 'createdAt_desc';
  };
  const parseCouponStatus = (value: string | null) => {
    const validStatuses = new Set(['ALL', 'ACTIVE', 'UPCOMING', 'EXPIRED', 'DEPLETED', 'INACTIVE']);
    return value && validStatuses.has(value) ? value : 'ALL';
  };
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState((searchParams.get('q') ?? '').trim());
  const [statusFilter, setStatusFilter] = useState<string>(parseCouponStatus(searchParams.get('status')));
  const [sort, setSort] = useState<CouponSortValue>(parseCouponSort(searchParams.get('sort')));
  const [page, setPage] = useState(parsePositiveInt(searchParams.get('page'), 1));
  const [pageSize, setPageSize] = useState(parsePositiveInt(searchParams.get('pageSize'), 20));
  const [totalPages, setTotalPages] = useState(1);
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    expired: 0,
    depleted: 0,
    upcoming: 0,
    inactive: 0,
  });

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const nextSearch = searchParams.get('q') ?? '';
    const nextStatus = parseCouponStatus(searchParams.get('status'));
    const nextSort = parseCouponSort(searchParams.get('sort'));
    const nextPage = parsePositiveInt(searchParams.get('page'), 1);
    const nextPageSize = parsePositiveInt(searchParams.get('pageSize'), 20);

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatusFilter((current) => (current === nextStatus ? current : nextStatus));
    setSort((current) => (current === nextSort ? current : nextSort));
    setPage((current) => (current === nextPage ? current : nextPage));
    setPageSize((current) => (current === nextPageSize ? current : nextPageSize));
  }, [searchParams]);

  const loadCoupons = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;

    if (isFirstLoad) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const resp = await fetchCoupons({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        includeHidden: true,
        status: statusFilter as Coupon['status'] | 'ALL',
        sort,
      });

      if (requestIdRef.current !== requestId) return;

      setCoupons(resp.coupons);
      setTotalPages(resp.pagination.totalPages);
      if (resp.summary) {
        setSummaryCounts(resp.summary);
      }
      hasLoadedRef.current = true;
    } catch (err: unknown) {
      if (requestIdRef.current !== requestId) return;
      const typedError = err as { message?: string };
      setError(typedError.message ?? t('coupons:feedback.loadError'));
    } finally {
      if (requestIdRef.current !== requestId) return;
      if (isFirstLoad) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [debouncedSearch, page, pageSize, sort, statusFilter, t]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (search.trim()) nextSearchParams.set('q', search.trim());
    if (statusFilter !== 'ALL') nextSearchParams.set('status', statusFilter);
    if (sort !== 'createdAt_desc') nextSearchParams.set('sort', sort);
    if (page > 1) nextSearchParams.set('page', page.toString());
    if (pageSize !== 20) nextSearchParams.set('pageSize', pageSize.toString());

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
  }, [page, pageSize, search, searchParams, setSearchParams, sort, statusFilter]);

  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await loadCoupons();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [loadCoupons]);

  const handleChangeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  const handleChangeStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleChangeSort = useCallback((value: CouponSortValue) => {
    setSort(value);
    setPage(1);
  }, []);

  const handleChangePageSize = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const setToast = useCallback((toast: { message: string; type: 'success' | 'error' }) => {
    fireToast({ type: toast.type, title: toast.message });
  }, [fireToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialogMode(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteTarget.couponId);
      setToast({ message: t('coupons:feedback.deleteSuccess', { code: deleteTarget.code }), type: 'success' });
      setDeleteTarget(null);
      await loadCoupons();
    } catch (err: unknown) {
      const typedError = err as { message?: string };
      setToast({ message: typedError.message ?? 'Có lỗi xảy ra.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (coupon: Coupon) => {
    if (isCouponEditLocked(coupon)) {
      setToast({
        message:
          coupon.status === 'INACTIVE'
            ? 'Mã giảm giá vô hiệu không thể chỉnh sửa.'
            : 'Mã giảm giá đã hết hạn không thể chỉnh sửa.',
        type: 'error',
      });
      return;
    }

    setSelectedCoupon(coupon);
    setDialogMode('edit');
  };

  return (
    <AdminPageShell className="min-h-full">
      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out both; }
        .animate-scale-in { animation: scale-in 0.18s ease-out both; }
      `}</style>

      <AdminSectionCard className="flex-1 overflow-hidden bg-[#0e0e0e]" bodyClassName="flex h-full flex-col">
        <CouponsPageControls
          onChangePageSize={handleChangePageSize}
          isManualRefreshing={isManualRefreshing}
          isRefreshing={isRefreshing}
          loading={loading}
          onChangeSearch={handleChangeSearch}
          onChangeSort={handleChangeSort}
          onChangeStatusFilter={handleChangeStatusFilter}
          onClearSearch={handleClearSearch}
          onCreateCoupon={() => {
            setSelectedCoupon(null);
            setDialogMode('create');
          }}
          onRefresh={() => {
            void handleManualRefresh();
          }}
          pageSize={pageSize}
          search={search}
          sort={sort}
          statusFilter={statusFilter}
          summaryCounts={summaryCounts}
          t={t as (key: string, opts?: Record<string, unknown>) => string}
        />

        <CouponsTable
          coupons={coupons}
          error={error}
          formatCurrency={fmtCurrency}
          formatDate={fmtDate}
          loading={loading}
          onClearFilters={() => {
            setSearch('');
            setStatusFilter('ALL');
          }}
          onDelete={setDeleteTarget}
          onEdit={openEdit}
          onRetry={() => {
            void loadCoupons();
          }}
          search={search}
          statusFilter={statusFilter}
          t={t as (key: string, opts?: Record<string, unknown>) => string}
        />
      </AdminSectionCard>

      <CouponsPagination
        loading={loading}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        page={page}
        pageSize={pageSize}
        t={t as (key: string, opts?: Record<string, unknown>) => string}
        totalPages={totalPages}
      />

      {dialogMode && (
        <Suspense fallback={<CouponDialogFallback />}>
          <LazyCouponDialog
            coupon={dialogMode === 'edit' ? selectedCoupon : null}
            formatCurrencyInput={fmtCurrencyInput}
            generateCode={generateCode}
            normalizeCurrencyInput={normalizeCurrencyInput}
            onClose={() => setDialogMode(null)}
            onSaved={loadCoupons}
            setToast={setToast}
            t={t as (key: string, opts?: Record<string, unknown>) => string}
            toInputDate={toInputDate}
          />
        </Suspense>
      )}

      {deleteTarget && (
        <Suspense fallback={<CouponDialogFallback tone="danger" />}>
          <LazyCouponDeleteDialog
            coupon={deleteTarget}
            loading={deleting}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => {
              void handleDelete();
            }}
            t={t as (key: string, opts?: Record<string, unknown>) => string}
          />
        </Suspense>
      )}
    </AdminPageShell>
  );
};
