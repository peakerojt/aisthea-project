import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { orderService, Order } from '@/common/services/order.service';
import { Search } from 'lucide-react';
import { formatVietnamTime } from '@/common/utils/formatDate';
import { useTranslation } from 'react-i18next';

export const MyOrders: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'myOrders' });
  const { role } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('');

  const statusTabs = useMemo(
    () => [
      { label: t('tabs.all'), value: '' },
      { label: t('tabs.pending'), value: 'Pending' },
      { label: t('tabs.shipping'), value: 'Shipping' },
      { label: t('tabs.delivered'), value: 'Delivered' },
      { label: t('tabs.cancelled'), value: 'Cancelled' }
    ],
    [t]
  );

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders({ status: statusFilter || undefined, page: 1, pageSize: 20, sort: 'createdAt_desc' });
      setOrders(res.orders || []);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || t('errors.loadOrders'));
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
            <h1 className="text-4xl font-black uppercase tracking-tighter">{t('title')}</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { navigate('/tracking') }}
              className="flex items-center gap-2 px-4 py-3 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold uppercase tracking-widest rounded"
            >
              <Search size={13} />
              {t('actions.trackOrder')}
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
            >{t('actions.backToAccount')}</button>
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
            >{t('actions.refresh')}</button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-sm text-white/50">{t('states.loading')}</div>
            ) : orders.length === 0 ? (
              <div className="bg-black/20 rounded p-10 text-center border border-white/5">
                <span className="material-symbols-outlined text-5xl text-white/20 mb-2">receipt_long</span>
                <p className="text-gray-500 text-sm">{t('states.empty')}</p>
                <button
                  onClick={() => navigate('/collection')}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
                >{t('actions.startShopping')}</button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.orderId} className="p-5 border border-white/10 bg-black/20 rounded-sm flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm text-white">#{o.orderNumber}</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">{o.createdAt ? formatVietnamTime(o.createdAt) : ''}</span>
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-white/70">{o.status || t('states.unknown')}</span>
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-white/50">{o.paymentStatus || t('states.none')}</span>
                      </div>
                      <div className="mt-2 text-sm text-white/70">
{t('labels.total')}: <span className="text-white font-semibold">{o.totalAmount}</span>
                        <span className="text-white/30 mx-2">•</span>
{t('labels.items')}: <span className="text-white font-semibold">{o.itemCount}</span>
                      </div>
                      {(o.trackingNumber || o.carrier) && (
                        <div className="mt-2 text-xs text-white/40">
                          {o.carrier ? `${o.carrier}` : t('labels.carrier')} {o.trackingNumber ? `• ${o.trackingNumber}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => goToOrderDetailPage(o.orderId)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >{t('actions.view')}</button>
                    </div>
                  </div>
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




