import { FormEvent, useEffect, useState } from 'react';
import { publicTracking } from '../services/tracking.service';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, ShieldCheck, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';

// ─── Carrier badge colours ────────────────────────────────────────────────────
const CARRIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'Giao Hàng Tiết Kiệm': { bg: 'bg-orange-500', text: 'text-white', label: 'GHTK' },
  'Viettel Post': { bg: 'bg-red-600', text: 'text-white', label: 'VTP' },
  'GIAO HANG NHANH': { bg: 'bg-blue-600', text: 'text-white', label: 'GHN' },
  'GHN': { bg: 'bg-blue-600', text: 'text-white', label: 'GHN' },
  'J&T Express': { bg: 'bg-rose-600', text: 'text-white', label: 'J&T' },
  'Ninja Van': { bg: 'bg-gray-800', text: 'text-white', label: 'NV' },
};

// ─── Feature pills shown below the form ──────────────────────────────────────
const FEATURES = [
  { icon: ShieldCheck, color: 'text-emerald-400', label: 'Tra cứu bảo mật' },
  { icon: Package, color: 'text-blue-400', label: 'Cập nhật thời gian thực' },
  { icon: Search, color: 'text-violet-400', label: 'Xem lộ trình chi tiết' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function TrackingLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Surface any redirect-error (e.g. from TrackingDetailPage unauthorized bounce)
  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) setError(state.error);
  }, [location.state]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimCode = orderCode.trim();
    const trimPhone = phone.trim();

    if (!trimCode) { setError('Vui lòng nhập mã đơn hàng.'); return; }
    if (!trimPhone) { setError('Vui lòng nhập số điện thoại đặt hàng.'); return; }

    setLoading(true);
    setError(null);

    try {
      const data = await publicTracking(trimCode, trimPhone);

      // Persist lookup credentials so TrackingDetailPage can re-verify
      window.sessionStorage.setItem(
        'publicTrackingLookup',
        JSON.stringify({ orderCode: trimCode, contact: trimPhone }),
      );

      navigate(`/tracking/${(data as any).orderId}?orderCode=${encodeURIComponent(trimCode)}&phone=${encodeURIComponent(trimPhone)}`);
    } catch (err: any) {
      const code = err?.response?.data?.errorCode;
      setError(
        code === 'TRACKING_NOT_FOUND'
          ? 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại Mã đơn và Số điện thoại.'
          : err.message || 'Tra cứu thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Google Font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* ── Back button ─────────────────────────────────────────────── */}
      <div className="fixed top-5 left-5 z-10">
        <button
          onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          My Orders
        </button>
      </div>

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-widest">
          <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
          Theo dõi thời gian thực
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
          Tra cứu <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">đơn hàng</span>
        </h1>
        <p className="text-slate-400 text-base max-w-sm mx-auto">
          Nhập mã đơn và số điện thoại để xem trạng thái và lộ trình giao hàng chi tiết.
        </p>
      </div>

      {/* ── Glassmorphic Card ────────────────────────────────────────── */}
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40"
        >
          {/* Subtle glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

          {/* Mã đơn hàng */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              Mã đơn hàng
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="order-code"
                aria-label="Mã đơn hàng"
                type="text"
                placeholder="Ví dụ: ORD-TEST-0001"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm
                           focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:ring-1 focus:ring-blue-500/30
                           transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              Số điện thoại đặt hàng
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="phone"
                aria-label="Số điện thoại đặt hàng"
                type="tel"
                placeholder="Ví dụ: 0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm
                           focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:ring-1 focus:ring-blue-500/30
                           transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
              <span className="mt-0.5 size-4 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                       text-white shadow-lg shadow-blue-500/25 transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang tra cứu...
              </>
            ) : (
              <>
                <Search className="size-4" />
                Tra cứu đơn hàng
                <ChevronRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* ── Feature chips ────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
          {FEATURES.map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <Icon className={`size-3.5 ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
