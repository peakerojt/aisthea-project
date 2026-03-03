import { FormEvent, useState } from 'react';
import { publicTracking } from '../services/tracking.service';
import { useNavigate } from 'react-router-dom';

export function TrackingLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedOrderCode = orderCode.trim();
      const normalizedContact = contact.trim();
      const data = await publicTracking(normalizedOrderCode, normalizedContact);

      window.sessionStorage.setItem(
        'publicTrackingLookup',
        JSON.stringify({ orderCode: normalizedOrderCode, contact: normalizedContact }),
      );

      navigate(`/tracking/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Tra cứu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-10 text-slate-100">
      <h1 className="mb-2 text-3xl font-bold text-white">Tracking Lookup</h1>
      <p className="mb-6 text-sm text-slate-300">Nhập mã đơn và số điện thoại/email đặt hàng để tra cứu.</p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
        <label className="block">
          <span className="text-sm font-medium text-slate-200">Order code</span>
          <input
            aria-label="order-code"
            placeholder="Ví dụ: ORD-TEST-0001"
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-200">Phone / Email</span>
          <input
            aria-label="contact"
            placeholder="Ví dụ: 0901234567"
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>

        <button
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Track order'}
        </button>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </main>
  );
}
