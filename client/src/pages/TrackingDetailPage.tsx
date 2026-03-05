import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderTracking, publicTracking } from '../services/tracking.service';
import { useTrackingStore } from '../store/tracking.store';
import { useOrderTrackingRealtime } from '../hooks/useOrderTrackingRealtime';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, RefreshCw,
  ArrowLeft, Wifi, WifiOff, Box, AlertTriangle, Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Status configuration ─────────────────────────────────────────────────────────
type StepId = 'PENDING' | 'PACKING' | 'SHIPPING' | 'DELIVERED';

const MAIN_STEPS: Array<{ id: StepId; label: string; icon: typeof Clock }> = [
  { id: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
  { id: 'PACKING', label: 'Đóng gói', icon: Box },
  { id: 'SHIPPING', label: 'Đang giao', icon: Truck },
  { id: 'DELIVERED', label: 'Thành công', icon: CheckCircle2 },
];

const STATUS_TO_STEP: Record<string, number> = {
  // UPPERCASE (from tracking module)
  PENDING: 0,
  CONFIRMED: 0,
  PACKING: 1,
  PROCESSING: 1,
  SHIPPING: 2,
  SHIPPED: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
  FAILED_DELIVERY: 2,
  CANCELLED: -1,
  RETURN_REQUESTED: -1,
  RETURNED: -1,
  // PascalCase (direct from DB / order.controller.ts)
  Pending: 0,
  Processing: 1,
  Shipping: 2,
  Delivered: 3,
  Cancelled: -1,
  Returned: -1,
  Return_Requested: -1,
};

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PACKING: Box,
  PROCESSING: Box,
  SHIPPING: Truck,
  SHIPPED: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  FAILED_DELIVERY: AlertTriangle,
  CANCELLED: AlertTriangle,
  RETURN_REQUESTED: RefreshCw,
  RETURNED: RefreshCw,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-amber-400  bg-amber-400/10  border-amber-400/30',
  CONFIRMED: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  PACKING: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  PROCESSING: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  SHIPPING: 'text-sky-400    bg-sky-400/10    border-sky-400/30',
  SHIPPED: 'text-sky-400    bg-sky-400/10    border-sky-400/30',
  OUT_FOR_DELIVERY: 'text-sky-400    bg-sky-400/10    border-sky-400/30',
  DELIVERED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  FAILED_DELIVERY: 'text-red-400    bg-red-400/10    border-red-400/30',
  CANCELLED: 'text-red-400    bg-red-400/10    border-red-400/30',
  RETURN_REQUESTED: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  RETURNED: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
};

// Removed STATUS_LABEL constant
// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPublicLookupFromStorage() {
  const raw = window.sessionStorage.getItem('publicTrackingLookup');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.orderCode && parsed?.contact) return { orderCode: String(parsed.orderCode), contact: String(parsed.contact) };
    return null;
  } catch { return null; }
}

function formatDate(ts?: string | Date | null, opts?: Intl.DateTimeFormatOptions) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  });
}

function formatDateShort(ts?: string | Date | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function HorizontalStepper({ status, t }: { status: string; t: any }) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;
  const isCancelled = currentStep === -1;

  return (
    <div className="flex items-center gap-0 w-full">
      {MAIN_STEPS.map((step, idx) => {
        const completed = !isCancelled && idx < currentStep;
        const active = !isCancelled && idx === currentStep;
        const pending = isCancelled || idx > currentStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`
                size-9 rounded-full flex items-center justify-center transition-all duration-500
                ${completed ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : ''}
                ${active ? 'bg-blue-500   shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20' : ''}
                ${pending ? 'bg-slate-800  border border-slate-600' : ''}
              `}>
                <Icon className={`size-4 ${completed || active ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-xs font-medium text-center leading-tight max-w-[64px]
                ${completed ? 'text-emerald-400' : active ? 'text-blue-400' : 'text-slate-500'}
              `}>
                {t(`status.${step.id}`, { defaultValue: step.label })}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {idx < MAIN_STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 mb-5 relative">
                <div className="absolute inset-0 bg-slate-700 rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-blue-500"
                  style={{ width: completed ? '100%' : active ? '50%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineItem({ item, isFirst, t }: { item: any; isFirst: boolean; t: any }) {
  const Icon = STATUS_ICON[item.status.toUpperCase()] ?? STATUS_ICON[item.status] ?? Package;
  const color = STATUS_COLOR[item.status.toUpperCase()] ?? STATUS_COLOR[item.status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/30';

  return (
    <div className="relative flex gap-4">
      {/* Vertical line */}
      {!isFirst && <div className="absolute left-[18px] -top-4 bottom-4 w-px bg-slate-700" />}

      {/* Icon bubble */}
      <div className={`relative z-10 flex-shrink-0 size-9 rounded-full border flex items-center justify-center mt-0.5 ${color}`}>
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${color.split(' ')[0]}`}>
            {item.status ? t(`status.${item.status.toUpperCase()}`, { defaultValue: item.status }) : item.status}
          </span>
          <time className="text-xs text-slate-400 flex-shrink-0" dateTime={item.timestamp}>
            {formatDate(item.timestamp, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
          </time>
        </div>
        {item.location && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="size-3 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-400">{item.location}</span>
          </div>
        )}
        {item.note && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.note}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function TrackingDetailPage() {
  const { t } = useTranslation(['tracking']);
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = Number(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const tracking = useTrackingStore((s) => s.tracking);
  const setTracking = useTrackingStore((s) => s.setTracking);
  const clearTracking = useTrackingStore((s) => s.clearTracking);

  // Resolve public lookup from sessionStorage OR URL ?phone= param (for page reload)
  const publicLookup = useMemo(() => {
    const fromStorage = getPublicLookupFromStorage();
    if (fromStorage) return fromStorage;

    const phoneFromUrl = searchParams.get('phone');
    const orderCodeFromUrl = searchParams.get('orderCode') || id || '';
    if (phoneFromUrl) {
      return { orderCode: orderCodeFromUrl, contact: phoneFromUrl };
    }
    return null;
  }, [searchParams, id]);

  const isPublicMode = Boolean(publicLookup);

  // Real-time WebSocket (only in authenticated mode)
  useOrderTrackingRealtime(orderId, undefined, !isPublicMode);

  // Initial data fetch
  useEffect(() => {
    if (!orderId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    clearTracking();

    (async () => {
      try {
        let data: any;
        if (isPublicMode && publicLookup) {
          data = await publicTracking(publicLookup.orderCode, publicLookup.contact);
        } else {
          data = await getOrderTracking(orderId);
        }
        if (mounted) setTracking(data);
      } catch (err: any) {
        if (!mounted) return;
        const status = err.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          navigate('/tracking', { state: { error: 'Vui lòng nhập mã đơn hàng và số điện thoại để tra cứu.' } });
        } else {
          setError(err.message || 'Không thể tải dữ liệu đơn hàng.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [orderId, isPublicMode, publicLookup, setTracking, clearTracking, navigate]);

  // Detect socket connectivity from hook side-effect
  useEffect(() => {
    if (tracking) setConnected(true);
  }, [tracking]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"
        style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          <span className="text-slate-400 text-sm">Đang tải thông tin đơn hàng...</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4"
        style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div className="bg-white/5 border border-red-500/20 rounded-2xl p-8 max-w-sm text-center">
          <AlertTriangle className="size-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Có lỗi xảy ra</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/tracking')} className="text-blue-400 text-sm hover:text-blue-300 transition-colors cursor-pointer">
            ← Tra cứu lại
          </button>
        </div>
      </div>
    );
  }

  if (!tracking) return null;

  const carrier = tracking.carrier ?? tracking.shipment?.carrier ?? null;
  const trackingNum = tracking.trackingNumber ?? tracking.shipment?.trackingNumber ?? null;
  const eta = tracking.estimatedDeliveryDate ?? tracking.shipment?.eta ?? tracking.eta ?? null;
  const location = tracking.shipment?.lastKnownLocation ?? null;
  const timeline = [...(tracking.timeline ?? [])].reverse(); // newest first
  const statusColor = STATUS_COLOR[tracking.currentStatus] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/30';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">

        {/* ── Top navigation ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to My Orders */}
            <button
              onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
              My Orders
            </button>

            <span className="text-slate-700 text-xs">|</span>

            {/* New tracking lookup */}
            <button
              onClick={() => navigate('/tracking')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 text-sm transition-colors cursor-pointer"
            >
              <Search className="size-3.5" />
              Tra cứu mới
            </button>
          </div>

          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
            ${connected ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' : 'text-slate-500 border-slate-600 bg-transparent'}
          `}>
            {connected
              ? <><Wifi className="size-3" /><span>Theo dõi trực tiếp</span><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /></>
              : <><WifiOff className="size-3" /><span>Ngoại tuyến</span></>
            }
          </div>
        </div>

        {/* ── Order header card ────────────────────────────────────────── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Đơn hàng</p>
              <h1 className="text-xl font-bold text-white">{tracking.orderCode}</h1>
            </div>
            {/* Status badge */}
            <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
              {tracking.currentStatus ? t(`status.${tracking.currentStatus.toUpperCase()}`, { defaultValue: tracking.currentStatus }) : tracking.currentStatus}
            </span>
          </div>

          {/* Carrier + Tracking number + ETA row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <InfoChip
              label="Đơn vị vận chuyển"
              value={carrier ?? '—'}
              icon={<Truck className="size-3.5 text-blue-400" />}
            />
            <InfoChip
              label="Mã vận đơn"
              value={trackingNum ?? '—'}
              icon={<Package className="size-3.5 text-violet-400" />}
            />
            <InfoChip
              label="Dự kiến giao hàng"
              value={eta ? formatDateShort(eta) ?? '—' : '—'}
              icon={<Clock className="size-3.5 text-amber-400" />}
            />
          </div>

          {/* Last known location */}
          {location && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/3 rounded-lg px-3 py-2 mb-4">
              <MapPin className="size-3.5 text-sky-400 flex-shrink-0" />
              <span>Vị trí gần nhất: <span className="text-slate-200">{location}</span></span>
            </div>
          )}

          {/* ── Horizontal stepper ──────────────────────────────────────── */}
          <HorizontalStepper status={tracking.currentStatus} t={t} />
        </div>

        {/* ── Product items ────────────────────────────────────────────── */}
        {tracking.items && tracking.items.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Package className="size-4 text-slate-400" />
              Sản phẩm trong đơn ({tracking.items.length})
            </h2>
            <div className="space-y-3">
              {tracking.items.map((item) => (
                <div key={item.orderItemId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200 font-medium truncate block">{item.productName}</span>
                    <span className="text-slate-500 text-xs">{item.variantName} × {item.quantity}</span>
                  </div>
                  <span className="text-slate-300 font-medium flex-shrink-0">
                    {Number(item.unitPrice).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            Lịch sử vận chuyển
          </h2>
          {timeline.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Chưa có thông tin vận chuyển.</p>
          ) : (
            <div className="relative">
              {/* Vertical guide line */}
              <div className="absolute left-[18px] top-4 bottom-4 w-px bg-slate-700" />
              {timeline.map((item, idx) => (
                <TimelineItem key={idx} item={item} isFirst={idx === 0} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 pb-4">
          Thông tin được cập nhật tự động khi có thay đổi. Không cần tải lại trang.
        </p>
      </div>
    </div>
  );
}

// ─── InfoChip sub-component ───────────────────────────────────────────────────
function InfoChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5 text-slate-500 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-slate-200 text-sm font-semibold leading-tight">{value}</span>
    </div>
  );
}
