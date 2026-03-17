import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Package, ChevronLeft, ChevronRight, Eye,
  AlertCircle, FilterX, Calendar, Copy, RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { adminOrderService, AdminOrder } from '@/common/services/order.service';
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminTabs,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Pending', label: 'Chờ xác nhận' },
  { key: 'Processing', label: 'Đang xử lý' },
  { key: 'Shipping', label: 'Đang giao' },
  { key: 'Delivered', label: 'Đã giao' },
  { key: 'Cancelled', label: 'Đã hủy' },
] as const;

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Mới nhất' },
  { value: 'createdAt_asc', label: 'Cũ nhất' },
  { value: 'totalAmount_desc', label: 'Giá trị cao nhất' },
  { value: 'totalAmount_asc', label: 'Giá trị thấp nhất' },
  { value: 'status_asc', label: 'Theo trạng thái' },
  { value: 'paymentStatus_desc', label: 'Theo thanh toán' },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type StatusTabKey = (typeof STATUS_TABS)[number]['key'];

export const formatVND = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

export const getOrderStatusColor = (status: string | null | undefined) => {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING':
      return {
        badge: 'bg-amber-500/12 text-amber-300 border-amber-400/20',
        dot: 'bg-amber-300',
      };
    case 'PROCESSING':
      return {
        badge: 'bg-sky-500/12 text-sky-300 border-sky-400/20',
        dot: 'bg-sky-300',
      };
    case 'SHIPPING':
      return {
        badge: 'bg-cyan-500/12 text-cyan-300 border-cyan-400/20',
        dot: 'bg-cyan-300',
      };
    case 'DELIVERED':
    case 'COMPLETED':
      return {
        badge: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20',
        dot: 'bg-emerald-300',
      };
    case 'CANCELLED':
      return {
        badge: 'bg-red-500/12 text-red-300 border-red-400/20',
        dot: 'bg-red-300',
      };
    default:
      return {
        badge: 'bg-white/[0.04] text-white/55 border-white/10',
        dot: 'bg-white/40',
      };
  }
};

const getCompactStatusLabel = (status: string | null | undefined) => {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'SHIPPING':
      return 'Đang giao';
    case 'DELIVERED':
    case 'COMPLETED':
      return 'Đã giao';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status || 'Khác';
  }
};

const getPaymentBadgeTone = (paymentStatus: string | null | undefined, paymentMethod?: string) => {
  const normalizedStatus = (paymentStatus ?? '').toUpperCase();
  const normalizedMethod = (paymentMethod ?? '').toUpperCase();

  if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'PAID' || normalizedStatus === 'SUCCESS') {
    return 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20';
  }

  if (normalizedMethod === 'COD') {
    return 'bg-amber-500/12 text-amber-300 border-amber-400/20';
  }

  return 'bg-white/[0.04] text-white/65 border-white/10';
};

const getCompactPaymentLabel = (paymentStatus: string | null | undefined, paymentMethod?: string) => {
  const normalizedStatus = (paymentStatus ?? '').toUpperCase();
  const normalizedMethod = (paymentMethod ?? '').toUpperCase();

  if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'PAID' || normalizedStatus === 'SUCCESS') {
    return 'Đã thanh toán';
  }

  if (normalizedMethod === 'COD') {
    return 'COD chưa thu';
  }

  return 'Chờ thanh toán';
};

const getCompactPaymentMethodLabel = (paymentMethod?: string) => {
  const normalizedMethod = (paymentMethod ?? '').toUpperCase();

  switch (normalizedMethod) {
    case 'COD':
      return 'COD';
    case 'VNPAY':
      return 'VNPAY';
    default:
      return paymentMethod || 'Khác';
  }
};

const shortenOrderNumber = (value: string) => {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
};

const formatDateParts = (iso?: string) => {
  if (!iso) {
    return { time: '—', date: '—' };
  }

  const date = new Date(iso);
  return {
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
    date: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
  };
};

const getVisiblePages = (page: number, totalPages: number) => {
  const maxVisible = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - (maxVisible - 1)));
  return Array.from(
    { length: Math.min(maxVisible, totalPages) },
    (_, index) => start + index,
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { badge, dot } = getOrderStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {getCompactStatusLabel(status)}
    </span>
  );
};

const PaymentBadge: React.FC<{ paymentStatus: string; paymentMethod?: string }> = ({
  paymentStatus,
  paymentMethod,
}) => (
  <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPaymentBadgeTone(paymentStatus, paymentMethod)}`}>
    {getCompactPaymentLabel(paymentStatus, paymentMethod)}
  </span>
);

interface OrderTableRowProps {
  order: AdminOrder;
  onOpen: (orderId: number) => void;
  onCopy: (orderNumber: string) => void;
}

const OrderTableRow = React.memo(({
  order,
  onOpen,
  onCopy,
}: OrderTableRowProps) => {
  const created = formatDateParts(order.createdAt);

  const handleOpen = () => onOpen(order.orderId);

  return (
    <tr
      className="group cursor-pointer border-b border-white/[0.04] text-sm transition-colors hover:bg-white/[0.03]"
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      tabIndex={0}
    >
      <td className="px-5 py-3.5 align-middle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white/92">
              {shortenOrderNumber(order.orderNumber)}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCopy(order.orderNumber);
              }}
              className="rounded-md border border-white/10 p-1 text-white/35 transition-colors duration-150 hover:border-white/20 hover:text-white/80"
              title="Sao chép mã đơn"
            >
              <Copy size={12} />
            </button>
          </div>
          <p className="text-[11px] text-white/50">{order.itemCount} sản phẩm</p>
        </div>
      </td>

      <td className="px-5 py-3.5 align-middle">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-bold uppercase text-white/70">
            {order.customerName?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/90">{order.customerName}</p>
            <p className="mt-0.5 text-[11px] text-white/52">{order.customerPhone}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5 align-middle">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/88">{created.time}</p>
          <p className="text-[11px] text-white/52">{created.date}</p>
        </div>
      </td>

      <td className="px-5 py-3.5 align-middle">
        <span className="text-sm font-bold text-white">{formatVND(order.totalAmount)}</span>
      </td>

      <td className="px-5 py-3.5 align-middle">
        <div className="space-y-1.5">
          <PaymentBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/42">
            {getCompactPaymentMethodLabel(order.paymentMethod)}
          </p>
        </div>
      </td>

      <td className="px-5 py-3.5 align-middle">
        <StatusBadge status={order.status} />
      </td>

      <td className="sticky right-0 px-5 py-3.5 align-middle text-right bg-[#0f1014] transition-colors duration-150 group-hover:bg-[#14161b]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleOpen();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          <Eye size={13} />
          Chi tiết
        </button>
      </td>
    </tr>
  );
});

export const Orders: React.FC = () => {
  const { t } = useTranslation(['orders']);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTabKey>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<StatusTabKey, number>>({
    ALL: 0,
    Pending: 0,
    Processing: 0,
    Shipping: 0,
    Delivered: 0,
    Cancelled: 0,
  });

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await adminOrderService.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        pageSize,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sort,
      });

      if (requestIdRef.current !== requestId) return;
      setOrders(res.orders);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
      hasLoadedRef.current = true;
    } catch (e: unknown) {
      if (requestIdRef.current !== requestId) return;
      const requestError = e as { message?: string };
      setError(requestError.message || t('page.loadError'));
    } finally {
      if (requestIdRef.current !== requestId) return;
      if (isFirstLoad) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [activeTab, endDate, page, pageSize, search, sort, startDate, t]);

  const loadTabCounts = useCallback(async () => {
    try {
      const counts = await Promise.all(
        STATUS_TABS.map(async (tab) => {
          const res = await adminOrderService.getAll({
            status: tab.key === 'ALL' ? undefined : tab.key,
            page: 1,
            pageSize: 1,
            search: search || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });

          return [tab.key, res.pagination.total] as const;
        }),
      );

      setTabCounts(Object.fromEntries(counts) as Record<StatusTabKey, number>);
    } catch {
      // Keep the previous counts if the auxiliary request fails.
    }
  }, [endDate, search, startDate]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts]);

  useEffect(() => () => {
    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }
  }, []);

  const handleTabChange = (tab: StatusTabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setSearchInput(nextValue);

    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(() => {
      setSearch(nextValue);
      setPage(1);
    }, 400);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setActiveTab('ALL');
    setSort('createdAt_desc');
    setPage(1);
  };

  const handleRefresh = () => {
    void Promise.all([loadOrders(), loadTabCounts()]);
  };

  const handleCopyOrderNumber = useCallback(async (orderNumber: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderNumber);
    } catch {
      // Ignore clipboard failures to keep the table interaction lightweight.
    }
  }, []);

  const hasFilters = !!search || !!startDate || !!endDate || sort !== 'createdAt_desc';
  const rangeStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const rangeEnd = Math.min(total, page * pageSize);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <AdminPageShell>
      <AdminSectionCard bodyClassName="space-y-5 p-5 lg:p-6">
        <AdminPageHeader
          icon={Package}
          title={t('page.title')}
          meta={t('page.orderCount', { count: total })}
        />

        <AdminToolbar
          actions={(
            <>
              <AdminSecondaryButton type="button" onClick={handleRefresh}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Làm mới
              </AdminSecondaryButton>
              {hasFilters && (
                <AdminSecondaryButton type="button" onClick={handleClearFilters}>
                  <FilterX size={14} />
                  Reset
                </AdminSecondaryButton>
              )}
            </>
          )}
        >
          <div className="grid w-full gap-3 md:grid-cols-2 2xl:min-w-[960px] 2xl:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(0,1fr))]">
              <label className="relative">
                <span className={adminUiTokens.fieldLabel}>
                  Tìm kiếm
                </span>
                <Search size={15} className="pointer-events-none absolute left-3 top-[38px] -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder={t('filters.searchPlaceholderAdmin')}
                  className={adminUiTokens.searchFieldControl}
                />
              </label>

              <label>
                <span className={`${adminUiTokens.fieldLabel} flex items-center gap-1.5`}>
                  <Calendar size={12} />
                  Từ ngày
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className={adminUiTokens.fieldControl}
                />
              </label>

              <label>
                <span className={`${adminUiTokens.fieldLabel} flex items-center gap-1.5`}>
                  <Calendar size={12} />
                  Đến ngày
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className={adminUiTokens.fieldControl}
                />
              </label>

              <label>
                <span className={adminUiTokens.fieldLabel}>
                  Sắp xếp
                </span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className={adminUiTokens.fieldControl}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#111318]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <label>
                  <span className={adminUiTokens.fieldLabel}>
                    / trang
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className={adminUiTokens.fieldControl}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-[#111318]">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
        </AdminToolbar>

        <AdminTabs
          items={STATUS_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: tabCounts[tab.key] ?? 0,
          }))}
          activeKey={activeTab}
          onChange={(key) => handleTabChange(key as StatusTabKey)}
        />
      </AdminSectionCard>

      <AdminSectionCard
        className="flex min-h-0 flex-1 flex-col bg-[#0f1014]"
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        {isRefreshing && !loading && <div className="h-px w-full bg-primary/60" />}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
              <p className="text-sm text-white/45">{t('page.loading')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <AlertCircle size={40} className="mx-auto text-red-400" />
              <h3 className="mt-4 text-base font-bold text-white">{t('page.dataError')}</h3>
              <p className="mt-2 text-sm text-white/55">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
              >
                {t('page.retry')}
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title={t('page.noOrders')}
            description={t('page.changeFilter')}
          />
        ) : (
          <>
            <div className="border-b border-white/[0.06] px-5 py-3 text-xs text-white/45 lg:px-6">
              Hiển thị {rangeStart}-{rangeEnd} trên {total} đơn hàng
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      t('table.orderId'),
                      t('table.customer'),
                      'Thời gian',
                      t('table.total'),
                      t('table.payment'),
                      'Giao hàng',
                      t('table.actions'),
                    ].map((label, index) => (
                      <th
                        key={label}
                        className={`sticky top-0 z-10 bg-[#111319] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/34 lg:px-6 ${
                          index === 6 ? 'sticky right-0 z-20 text-right' : ''
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderTableRow
                      key={order.orderId}
                      order={order}
                      onOpen={(orderId) => navigate(`/admin/orders/${orderId}`)}
                      onCopy={(orderNumber) => {
                        void handleCopyOrderNumber(orderNumber);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <p className="text-xs text-white/42">
              Trang {page}/{totalPages} · {total} đơn hàng
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={15} />
              </button>

              {visiblePages.map((visiblePage) => (
                <button
                  key={visiblePage}
                  type="button"
                  onClick={() => setPage(visiblePage)}
                  className={`h-9 min-w-9 rounded-xl px-3 text-xs font-bold transition-colors duration-150 ${
                    visiblePage === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-white/10 text-white/55 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {visiblePage}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
};
