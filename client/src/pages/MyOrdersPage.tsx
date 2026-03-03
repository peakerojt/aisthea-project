import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrdersTracking } from '../services/tracking.service';

export function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrdersTracking()
      .then(setOrders)
      .catch((err) => setError(err.message || 'Cannot load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4"><div className="h-6 w-56 animate-pulse rounded bg-slate-200" /></div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!orders.length) return <div className="p-4 text-slate-500">No orders yet.</div>;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.orderId} className="rounded-xl bg-white p-4 shadow">
            <p className="font-semibold">{order.orderCode || order.orderNumber}</p>
            <p className="text-sm text-slate-600">{order.status}</p>
            <Link className="mt-2 inline-block text-sm text-blue-600" to={`/tracking/${order.orderId}`}>
              View tracking
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
