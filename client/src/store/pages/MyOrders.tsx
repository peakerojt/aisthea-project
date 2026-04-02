import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { orderService, Order } from '@/common/services/order.service';
import { returnSummaryService, type MyReturnSummary } from '@/common/services/return.summary.service';
import {
  RETURN_SUMMARY_CHANGED_EVENT,
  type ReturnSummaryChangedDetail,
} from '@/common/events/returnSummary.events';
import { Search } from 'lucide-react';
import {
  shouldAutoRefreshRefundState,
} from '@/common/utils/returnRefresh';
import { useReturnAutoRefresh } from '@/common/hooks/useReturnAutoRefresh';
import { useTranslation } from 'react-i18next';
import {
  CustomerOrderCard,
  CustomerOrdersStatusTabs,
  filterCustomerOrders,
  type CustomerOrderStatusFilter,
} from '@/store/components/CustomerOrdersUI';

type OrderWithReturn = Order & {
  activeReturn?: MyReturnSummary | null;
};

const getLatestReturnSummaryCursor = (summaries: Iterable<MyReturnSummary>) => {
  let latestCursor: string | null = null;

  for (const summary of summaries) {
    if (!summary.updatedAt) {
      continue;
    }

    if (!latestCursor || summary.updatedAt > latestCursor) {
      latestCursor = summary.updatedAt;
    }
  }

  return latestCursor;
};

export const MyOrders: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'myOrders' });
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as any, { ...(options ?? {}), defaultValue: fallback } as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const { role } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithReturn[]>([]);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [returnSummaryCursor, setReturnSummaryCursor] = useState<string | null>(null);
  const [returnSummaryOrderIdsKey, setReturnSummaryOrderIdsKey] = useState('');
  const [returnSummaryCache, setReturnSummaryCache] = useState<Map<number, MyReturnSummary>>(new Map());
  const [expandedReturnOrderIds, setExpandedReturnOrderIds] = useState<Set<number>>(new Set());

  const [statusFilter, setStatusFilter] = useState<CustomerOrderStatusFilter>('');
  const titleLabel = resolveText('title', 'Đơn hàng của tôi');
  const subtitleLabel = resolveText('subtitle', 'Xem lịch sử và chi tiết đơn hàng');
  const trackOrderLabel = resolveText('actions.trackOrder', 'Tra cứu đơn hàng');
  const backToAccountLabel = resolveText('actions.backToAccount', 'Quay lại tài khoản');
  const startShoppingLabel = resolveText('actions.startShopping', 'Bắt đầu mua sắm');
  const loadingLabel = resolveText('states.loading', 'Đang tải đơn hàng...');
  const emptyLabel = resolveText('states.empty', 'Không tìm thấy đơn hàng.');
  const emptyReturnsLabel = resolveText('states.emptyReturns', 'Không có đơn hoàn hàng nào.');
  const loadOrdersErrorLabel = resolveText('errors.loadOrders', 'Không thể tải đơn hàng');
  const headerSecondaryButtonClassName =
    'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/74 transition-colors hover:border-white/18 hover:bg-white/[0.06] hover:text-white';

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requestStatus = statusFilter && statusFilter !== 'returns' ? statusFilter : undefined;
      const ordersResponse = await orderService.getMyOrders({
        status: requestStatus,
        page: 1,
        pageSize: 20,
        sort: 'createdAt_desc',
      });
      const loadedOrders = ordersResponse.orders || [];
      const orderIds = loadedOrders.map((order) => order.orderId);
      const orderIdsKey = orderIds.join(',');
      const canUseDelta = Boolean(
        returnSummaryCursor &&
        returnSummaryOrderIdsKey === orderIdsKey,
      );
      const returnSummaries =
        orderIds.length > 0
          ? await returnSummaryService
              .myReturnSummaries(1, orderIds.length, {
                orderIds,
                updatedSince: canUseDelta ? returnSummaryCursor ?? undefined : undefined,
              })
              .catch(() => null)
          : [];
      const returnsByOrderId = canUseDelta ? new Map(returnSummaryCache) : new Map<number, MyReturnSummary>();

      for (const record of returnSummaries ?? []) {
        returnsByOrderId.set(record.orderId, record);
      }

      setOrders(
        loadedOrders.map((order) => ({
          ...order,
          activeReturn: returnsByOrderId.get(order.orderId) ?? null,
        })),
      );
      const nextReturnSummaryCache = new Map<number, MyReturnSummary>();
      for (const orderId of orderIds) {
        const summary = returnsByOrderId.get(orderId);
        if (summary) {
          nextReturnSummaryCache.set(orderId, summary);
        }
      }
      const nextReturnSummaryCursor = getLatestReturnSummaryCursor(nextReturnSummaryCache.values());
      setReturnSummaryCache(nextReturnSummaryCache);
      setReturnSummaryOrderIdsKey(orderIdsKey);
      setReturnSummaryCursor(nextReturnSummaryCursor);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || loadOrdersErrorLabel);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'guest') {
      navigate('/login', { replace: true });
      return;
    }
    void loadOrders();
  }, [role, navigate, reloadNonce, statusFilter]);

  useEffect(() => {
    const handleReturnSummaryChanged = (event: Event) => {
      const detail = (event as CustomEvent<ReturnSummaryChangedDetail>).detail;
      const changedOrderId = detail?.orderId;

      if (
        typeof changedOrderId === 'number' &&
        changedOrderId > 0 &&
        !orders.some((order) => order.orderId === changedOrderId)
      ) {
        return;
      }

      setReloadNonce((current) => current + 1);
    };

    window.addEventListener(RETURN_SUMMARY_CHANGED_EVENT, handleReturnSummaryChanged as EventListener);

    return () => {
      window.removeEventListener(
        RETURN_SUMMARY_CHANGED_EVENT,
        handleReturnSummaryChanged as EventListener,
      );
    };
  }, [orders]);

  useReturnAutoRefresh({
    enabled: orders.some((order) => shouldAutoRefreshRefundState(order.activeReturn?.refundStatus)),
    onRefresh: () => setReloadNonce((current) => current + 1),
  });

  useEffect(() => {
    const visibleActiveReturnOrderIds = new Set(
      orders
        .filter((order) => Boolean(order.activeReturn?.returnRequestId))
        .map((order) => order.orderId),
    );

    setExpandedReturnOrderIds((current) => {
      const next = new Set<number>();
      current.forEach((orderId) => {
        if (visibleActiveReturnOrderIds.has(orderId)) {
          next.add(orderId);
        }
      });
      return next.size === current.size ? current : next;
    });
  }, [orders]);

  const visibleOrders = useMemo(
    () => filterCustomerOrders(orders, statusFilter),
    [orders, statusFilter],
  );

  const goToOrderDetailPage = (orderId: number) => {
    // Điều hướng sang route mới /orders/:id (React Router sẽ xử lý)
    navigate(`/orders/${orderId}`);
  };

  const goToReturnDetailPage = (orderId: number) => {
    navigate(`/orders/${orderId}/return`);
  };

  const toggleReturnPanel = (orderId: number) => {
    setExpandedReturnOrderIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <Header />

      <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">{titleLabel}</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">{subtitleLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { navigate('/tracking') }}
              className={headerSecondaryButtonClassName}
            >
              <Search size={13} />
              {trackOrderLabel}
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={headerSecondaryButtonClassName}
            >{backToAccountLabel}</button>
          </div>
        </div>

        <div className="bg-surface-dark border border-white/5 rounded-sm overflow-hidden">
          <CustomerOrdersStatusTabs
            statusFilter={statusFilter}
            onChange={setStatusFilter}
            onRefresh={loadOrders}
          />

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-sm text-white/50">{loadingLabel}</div>
            ) : visibleOrders.length === 0 ? (
              <div className="bg-black/20 rounded p-10 text-center border border-white/5">
                <span className="material-symbols-outlined text-5xl text-white/20 mb-2">receipt_long</span>
                <p className="text-gray-500 text-sm">{statusFilter === 'returns' ? emptyReturnsLabel : emptyLabel}</p>
                <button
                  onClick={() => navigate('/collection')}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
                >{startShoppingLabel}</button>
              </div>
            ) : (
                <div className="space-y-3">
                  {visibleOrders.map((o) => (
                    <CustomerOrderCard
                      key={o.orderId}
                      order={o}
                      isReturnExpanded={expandedReturnOrderIds.has(o.orderId)}
                      onToggleReturn={toggleReturnPanel}
                      onViewOrder={goToOrderDetailPage}
                      onViewReturn={goToReturnDetailPage}
                    />
                  ))}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal chi tiết đơn cũ đã được thay bằng trang /orders/:id */}
    </div>
  );
};




