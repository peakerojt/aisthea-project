import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { orderService, Order } from '@/common/services/order.service';
import { Search } from 'lucide-react';
import { formatVietnamTime } from '@/common/utils/formatDate';
import { formatCurrencyVND } from '@/common/utils/currency';
import { useTranslation } from 'react-i18next';
import { PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';
import { getCustomerOrderStatusMeta } from '@/store/utils/orderStatusDisplay';

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
  const [orders, setOrders] = useState<Order[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const titleLabel = resolveText('title', 'Đơn hàng của tôi');
  const subtitleLabel = resolveText('subtitle', 'Xem lịch sử và chi tiết đơn hàng');
  const tabAllLabel = resolveText('tabs.all', 'Tất cả');
  const tabPendingLabel = resolveText('tabs.pending', 'Chờ xác nhận');
  const tabShippingLabel = resolveText('tabs.shipping', 'Đang giao hàng');
  const tabDeliveredLabel = resolveText('tabs.delivered', 'Đã giao hàng');
  const tabCancelledLabel = resolveText('tabs.cancelled', 'Đã hủy');
  const trackOrderLabel = resolveText('actions.trackOrder', 'Tra cứu đơn hàng');
  const backToAccountLabel = resolveText('actions.backToAccount', 'Quay lại tài khoản');
  const refreshLabel = resolveText('actions.refresh', 'Làm mới');
  const startShoppingLabel = resolveText('actions.startShopping', 'Bắt đầu mua sắm');
  const viewLabel = resolveText('actions.view', 'Xem');
  const loadingLabel = resolveText('states.loading', 'Đang tải đơn hàng...');
  const emptyLabel = resolveText('states.empty', 'Không tìm thấy đơn hàng.');
  const unknownLabel = resolveText('states.unknown', 'Không xác định');
  const totalLabel = resolveText('labels.total', 'Tổng tiền');
  const itemsLabel = resolveText('labels.items', 'Số món');
  const orderCodeLabel = resolveText('labels.orderCode', 'Mã đơn hàng');
  const loadOrdersErrorLabel = resolveText('errors.loadOrders', 'Không thể tải đơn hàng');

  const statusTabs = useMemo(
    () => [
      { label: tabAllLabel, value: '' },
      { label: tabPendingLabel, value: 'Pending' },
      { label: tabShippingLabel, value: 'Shipping' },
      { label: tabDeliveredLabel, value: 'Delivered' },
      { label: tabCancelledLabel, value: 'Cancelled' }
    ],
    [tabAllLabel, tabPendingLabel, tabShippingLabel, tabDeliveredLabel, tabCancelledLabel]
  );

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders({ status: statusFilter || undefined, page: 1, pageSize: 20, sort: 'createdAt_desc' });
      setOrders(res.orders || []);
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
    loadOrders();
  }, [role, statusFilter, navigate]);

  const goToOrderDetailPage = (orderId: number) => {
    // Điều hướng sang route mới /orders/:id (React Router sẽ xử lý)
    navigate(`/orders/${orderId}`);
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
              className="flex items-center gap-2 px-4 py-3 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold uppercase tracking-widest rounded"
            >
              <Search size={13} />
              {trackOrderLabel}
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
            >{backToAccountLabel}</button>
          </div>
        </div>

        <div className="bg-surface-dark border border-white/5 rounded-sm overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex gap-2 overflow-x-auto">
            {statusTabs.map((t) => (
              <button
                key={t.label}
                onClick={() => setStatusFilter(t.value)}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded border transition-colors whitespace-nowrap ${statusFilter === t.value
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:bg-white/5'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={loadOrders}
              className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >{refreshLabel}</button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-sm text-white/50">{loadingLabel}</div>
            ) : orders.length === 0 ? (
              <div className="bg-black/20 rounded p-10 text-center border border-white/5">
                <span className="material-symbols-outlined text-5xl text-white/20 mb-2">receipt_long</span>
                <p className="text-gray-500 text-sm">{emptyLabel}</p>
                <button
                  onClick={() => navigate('/collection')}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
                >{startShoppingLabel}</button>
              </div>
            ) : (
                <div className="space-y-3">
                {orders.map((o) => {
                  const statusMeta = getCustomerOrderStatusMeta(o.status);

                  return (
                    <div key={o.orderId} className="p-5 border border-white/10 bg-black/20 rounded-sm flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm text-white">#{o.orderNumber}</span>
                          <span className="text-[10px] uppercase tracking-widest text-white/40">{o.createdAt ? formatVietnamTime(o.createdAt) : ''}</span>
                          <span
                            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${
                              statusMeta
                                ? `${statusMeta.badgeClass} ${statusMeta.textClass}`
                                : 'border-white/10 text-white/70'
                            }`}
                          >
                            {statusMeta?.label || o.status || unknownLabel}
                          </span>
                          <PaymentStatusBadge paymentMethod={o.paymentMethod} paymentStatus={o.paymentStatus} size="xs" uppercase className="tracking-widest" />
                        </div>
                        <div className="mt-2 text-sm text-white/70">
                          {totalLabel}: <span className="text-white font-semibold">{formatCurrencyVND(Number(o.totalAmount ?? 0))}</span>
                          <span className="text-white/30 mx-2">•</span>
                          {itemsLabel}: <span className="text-white font-semibold">{o.itemCount}</span>
                        </div>
                        {(o.orderCode || o.orderNumber) && (
                          <div className="mt-2 text-xs text-white/40">
                            {orderCodeLabel}: {o.orderCode ?? o.orderNumber}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => goToOrderDetailPage(o.orderId)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                        >{viewLabel}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal chi tiết đơn cũ đã được thay bằng trang /orders/:id */}
    </div>
  );
};




