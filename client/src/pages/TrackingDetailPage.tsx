import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderTracking, publicTracking } from '../services/tracking.service';
import { useTrackingStore } from '../store/tracking.store';
import { TrackingTimeline } from '../components/order/OrderTimeline';
import { StatusBadge } from '../components/order/StatusBadge';
import { useOrderTrackingRealtime } from '../hooks/useOrderTrackingRealtime';

function getPublicLookupFromStorage() {
  const raw = window.sessionStorage.getItem('publicTrackingLookup');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.orderCode && parsed?.contact) {
      return { orderCode: String(parsed.orderCode), contact: String(parsed.contact) };
    }
    return null;
  } catch {
    return null;
  }
}

export function TrackingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tracking = useTrackingStore((s) => s.tracking);
  const setTracking = useTrackingStore((s) => s.setTracking);
  const clearTracking = useTrackingStore((s) => s.clearTracking);

  const publicLookup = useMemo(() => getPublicLookupFromStorage(), []);
  const isPublicMode = Boolean(publicLookup);

  useOrderTrackingRealtime(orderId, undefined, !isPublicMode);

  useEffect(() => {
    if (!orderId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    clearTracking();

    const run = async () => {
      try {
        if (isPublicMode && publicLookup) {
          const data = await publicTracking(publicLookup.orderCode, publicLookup.contact);
          if (mounted) setTracking(data as any);
          return;
        }

        const data = await getOrderTracking(orderId);
        if (mounted) setTracking(data);
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Cannot load tracking');
          // If unauthorized or not found, send them back to the lookup page
          if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
            navigate('/tracking', { state: { error: 'Vui lòng nhập mã đơn hàng và số điện thoại để tra cứu.' } });
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [orderId, isPublicMode, publicLookup, setTracking, clearTracking]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );

  if (error) return <div className="min-h-screen bg-slate-50 p-4 text-red-600">{error}</div>;
  if (!tracking) return <div className="min-h-screen bg-slate-50 p-4 text-slate-500">Empty tracking data</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <section className="rounded-xl bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Order {tracking.orderCode}</h1>
            <StatusBadge status={tracking.currentStatus} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            ETA: {tracking.eta ? new Date(tracking.eta).toLocaleString() : 'N/A'}
          </p>
        </section>

        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
          <TrackingTimeline timeline={tracking.timeline} />
        </section>
      </main>
    </div>
  );
}
