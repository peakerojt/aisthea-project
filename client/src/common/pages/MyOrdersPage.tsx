import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrdersTracking } from '@/common/services/tracking.service';
import { useTranslation } from 'react-i18next';

interface TrackingOrder {
  orderId: number;
  orderCode?: string;
  orderNumber?: string;
  status: string;
}

export function MyOrdersPage() {
  const { t } = useTranslation('pages', { keyPrefix: 'myOrdersPage' });
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrdersTracking()
      .then((res: unknown) => {
        const data = (res as { data?: TrackingOrder[] }).data || res;
        setOrders(data as TrackingOrder[]);
      })
      .catch((err) => setError(err.message || t('errors.loadOrders')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div className="p-4"><div className="h-6 w-56 animate-pulse rounded bg-slate-200" /></div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!orders.length) return <div className="p-4 text-slate-500">{t('states.empty')}</div>;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.orderId} className="rounded-xl bg-white p-4 shadow">
            <p className="font-semibold">{order.orderCode || order.orderNumber}</p>
            <p className="text-sm text-slate-600">{order.status}</p>
            <Link className="mt-2 inline-block text-sm text-blue-600" to={`/tracking/${order.orderId}`}>
              {t('actions.viewTracking')}
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
