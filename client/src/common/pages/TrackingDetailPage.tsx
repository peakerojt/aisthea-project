import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderTracking, publicTracking } from '@/common/services/tracking.service';
import { useTrackingStore } from '@/store/state/tracking.store';
import { useOrderTrackingRealtime } from '@/common/hooks/useOrderTrackingRealtime';
import {
  Package, Truck, CheckCircle2, Clock, MapPin, RefreshCw,
  ArrowLeft, Wifi, WifiOff, Box, AlertTriangle, Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrackingData } from '@/types/tracking';
import { ORDER_STATUS } from '@/config/orderStatus.config';

// ─── Status configuration ─────────────────────────────────────────────────────────
type StepId = typeof ORDER_STATUS.PENDING | typeof ORDER_STATUS.PROCESSING | typeof ORDER_STATUS.SHIPPING | typeof ORDER_STATUS.DELIVERED;
const TRACKING_RETURN_REQUESTED = 'RETURN_REQUESTED' as const;

const toStatusKey = (status: string | null | undefined) =>
  (status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();

const getCanonicalTrackingStatus = (status: string | null | undefined) => {
  switch (toStatusKey(status)) {
    case 'PENDING':
      return ORDER_STATUS.PENDING;
    case 'CONFIRMED':
    case 'PACKING':
    case 'PROCESSING':
    case 'PAID':
      return ORDER_STATUS.PROCESSING;
    case 'SHIPPING':
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
    case 'FAILED_DELIVERY':
      return ORDER_STATUS.SHIPPING;
    case 'DELIVERED':
      return ORDER_STATUS.DELIVERED;
    case 'CANCELLED':
    case 'CANCELED':
      return ORDER_STATUS.CANCELLED;
    case 'RETURN_REQUESTED':
      return TRACKING_RETURN_REQUESTED;
    case 'RETURNED':
      return ORDER_STATUS.RETURNED;
    default:
      return status || ORDER_STATUS.PENDING;
  }
};

const getTrackingStatusKey = (status: string | null | undefined) => toStatusKey(getCanonicalTrackingStatus(status));

const MAIN_STEPS: Array<{ id: StepId; label: string; icon: typeof Clock }> = [
  { id: ORDER_STATUS.PENDING, label: 'Chờ xác nhận', icon: Clock },
  { id: ORDER_STATUS.PROCESSING, label: 'Đang xử lý', icon: Box },
  { id: ORDER_STATUS.SHIPPING, label: 'Đang giao hàng', icon: Truck },
  { id: ORDER_STATUS.DELIVERED, label: 'Đã giao hàng', icon: CheckCircle2 },
];

const TRACKING_STATUS_FALLBACKS: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
  [ORDER_STATUS.PROCESSING]: 'Đang xử lý',
  [ORDER_STATUS.SHIPPING]: 'Đang giao hàng',
  [ORDER_STATUS.DELIVERED]: 'Đã giao hàng',
  [ORDER_STATUS.CANCELLED]: 'Đã hủy',
  [TRACKING_RETURN_REQUESTED]: 'Yêu cầu trả hàng',
  [ORDER_STATUS.RETURNED]: 'Đã trả hàng',
};

const STATUS_TO_STEP: Record<string, number> = {
  [ORDER_STATUS.PENDING]: 0,
  [ORDER_STATUS.PROCESSING]: 1,
  [ORDER_STATUS.SHIPPING]: 2,
  [ORDER_STATUS.DELIVERED]: 3,
  [ORDER_STATUS.CANCELLED]: -1,
  [TRACKING_RETURN_REQUESTED]: -1,
  [ORDER_STATUS.RETURNED]: -1,
};

const STATUS_ICON: Record<string, typeof Clock> = {
  [ORDER_STATUS.PENDING]: Clock,
  [ORDER_STATUS.PROCESSING]: Box,
  [ORDER_STATUS.SHIPPING]: Truck,
  [ORDER_STATUS.DELIVERED]: CheckCircle2,
  [ORDER_STATUS.CANCELLED]: AlertTriangle,
  [TRACKING_RETURN_REQUESTED]: RefreshCw,
  [ORDER_STATUS.RETURNED]: RefreshCw,
};

const STATUS_COLOR: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  [ORDER_STATUS.PROCESSING]: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  [ORDER_STATUS.SHIPPING]: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  [ORDER_STATUS.DELIVERED]: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  [ORDER_STATUS.CANCELLED]: 'text-red-400 bg-red-400/10 border-red-400/30',
  [TRACKING_RETURN_REQUESTED]: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  [ORDER_STATUS.RETURNED]: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
};

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

const getTrackingStatusFallbackLabel = (status: string | null | undefined) =>
  TRACKING_STATUS_FALLBACKS[getCanonicalTrackingStatus(status)] ?? String(status ?? ORDER_STATUS.PENDING);

type ResolveTrackingText = (key: string, fallback: string, options?: Record<string, unknown>) => string;

// ─── Sub-components ───────────────────────────────────────────────────────────
function HorizontalStepper({ status, resolveText }: { status: string; resolveText: ResolveTrackingText }) {
  const canonicalStatus = getCanonicalTrackingStatus(status);
  const currentStep = STATUS_TO_STEP[canonicalStatus] ?? 0;
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
                {resolveText(`status.${getTrackingStatusKey(step.id)}`, step.label)}
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

function TimelineItem({
  item,
  isFirst,
  resolveText,
}: {
  item: { status: string; timestamp: string; location?: string; note?: string };
  isFirst: boolean;
  resolveText: ResolveTrackingText;
}) {
  const canonicalStatus = getCanonicalTrackingStatus(item.status);
  const Icon = STATUS_ICON[canonicalStatus] ?? Package;
  const color = STATUS_COLOR[canonicalStatus] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  const statusKey = getTrackingStatusKey(item.status);

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
            {item.status ? resolveText(`status.${statusKey}`, getTrackingStatusFallbackLabel(item.status)) : item.status}
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
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(.*?)\}\}/g, (_match, token) => String(options?.[String(token).trim()] ?? ''));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key, { defaultValue: fallback, ...options });
    return translated === key ? interpolateFallback(fallback, options) : translated;
  };

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
        let data: TrackingData;
        if (isPublicMode && publicLookup) {
          data = await publicTracking(publicLookup.orderCode, publicLookup.contact) as TrackingData;
        } else {
          data = await getOrderTracking(orderId) as TrackingData;
        }
        if (mounted) setTracking(data);
      } catch (err: unknown) {
        if (!mounted) return;
        const error = err as { response?: { status?: number }; message?: string };
        const status = error.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          navigate('/tracking', {
            state: { error: resolveText('errors.lookupRequired', 'Vui lòng nhập mã đơn hàng và số điện thoại để tra cứu.') },
          });
        } else {
          setError(error.message || resolveText('errors.loadTracking', 'Không thể tải dữ liệu theo dõi đơn hàng.'));
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
          <span className="text-slate-400 text-sm">{resolveText('page.loadingOrder', 'Đang tải thông tin đơn hàng...')}</span>
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
          <p className="text-white font-semibold mb-2">{resolveText('page.genericError', 'Có lỗi xảy ra')}</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/tracking')} className="text-blue-400 text-sm hover:text-blue-300 transition-colors cursor-pointer">
            ← {resolveText('page.lookupAgain', 'Tra cứu lại')}
          </button>
        </div>
      </div>
    );
  }

  if (!tracking) return null;

  const trackingCode = tracking.trackingCode ?? tracking.orderCode;
  const provider = tracking.provider ?? tracking.shipment?.provider ?? null;
  const providerOrderCode = tracking.providerOrderCode ?? tracking.shipment?.providerOrderCode ?? null;
  const shippingMode = tracking.shippingMode ?? tracking.shipment?.shippingMode ?? 'manual';
  const eta = tracking.estimatedDeliveryDate ?? tracking.shipment?.eta ?? tracking.eta ?? null;
  const location = tracking.shipment?.lastKnownLocation ?? null;
  const timeline = [...(tracking.timeline ?? [])].reverse(); // newest first
  const canonicalStatus = getCanonicalTrackingStatus(tracking.currentStatus);
  const statusKey = getTrackingStatusKey(tracking.currentStatus);
  const statusColor = STATUS_COLOR[canonicalStatus] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/30';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">

        {/* ── Top navigation ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to orders */}
            <button
              onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
              {resolveText('page.backToOrders', 'Quay lại đơn hàng')}
            </button>

            <span className="text-slate-700 text-xs">|</span>

            {/* New tracking lookup */}
            <button
              onClick={() => navigate('/tracking')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 text-sm transition-colors cursor-pointer"
            >
              <Search className="size-3.5" />
              {resolveText('page.newLookup', 'Tra cứu mới')}
            </button>
          </div>

          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
            ${connected ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' : 'text-slate-500 border-slate-600 bg-transparent'}
          `}>
            {connected
              ? <><Wifi className="size-3" /><span>{resolveText('page.live', 'Theo dõi trực tiếp')}</span><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /></>
              : <><WifiOff className="size-3" /><span>{resolveText('page.offline', 'Ngoại tuyến')}</span></>
            }
          </div>
        </div>

        {/* ── Order header card ────────────────────────────────────────── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">{resolveText('page.order', 'Đơn hàng')}</p>
              <h1 className="text-xl font-bold text-white">{tracking.orderCode}</h1>
            </div>
            {/* Status badge */}
            <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
              {tracking.currentStatus
                ? resolveText(`status.${statusKey}`, getTrackingStatusFallbackLabel(tracking.currentStatus))
                : tracking.currentStatus}
            </span>
          </div>

          {/* Order-first info row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <InfoChip
              label={resolveText('page.orderCode', 'Mã đơn hàng')}
              value={trackingCode}
              icon={<Package className="size-3.5 text-cyan-400" />}
            />
            <InfoChip
              label={resolveText('page.shippingMode', 'Hình thức giao hàng')}
              value={
                shippingMode === 'provider'
                  ? resolveText('page.shippingModeProvider', 'Qua đối tác vận chuyển')
                  : resolveText('page.shippingModeManual', 'Thủ công')
              }
              icon={<Truck className="size-3.5 text-blue-400" />}
            />
            <InfoChip
              label={
                provider
                  ? resolveText('page.providerOrderCode', 'Mã đơn trên đối tác')
                  : resolveText('page.estimatedDelivery', 'Dự kiến giao hàng')
              }
              value={provider ? (providerOrderCode ?? '—') : (eta ? formatDateShort(eta) ?? '—' : '—')}
              icon={provider ? <Truck className="size-3.5 text-sky-400" /> : <Clock className="size-3.5 text-amber-400" />}
            />
          </div>

          {provider && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/3 rounded-lg px-3 py-2 mb-4">
              <Truck className="size-3.5 text-sky-400 flex-shrink-0" />
              <span>{resolveText('page.provider', 'Đối tác vận chuyển')}: <span className="text-slate-200 uppercase">{provider}</span></span>
            </div>
          )}

          {/* Last known location */}
          {location && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/3 rounded-lg px-3 py-2 mb-4">
              <MapPin className="size-3.5 text-sky-400 flex-shrink-0" />
              <span>{resolveText('page.latestLocation', 'Vị trí gần nhất:')} <span className="text-slate-200">{location}</span></span>
            </div>
          )}

          {/* ── Horizontal stepper ──────────────────────────────────────── */}
          <HorizontalStepper status={canonicalStatus} resolveText={resolveText} />
        </div>

        {/* ── Product items ────────────────────────────────────────────── */}
        {tracking.items && tracking.items.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Package className="size-4 text-slate-400" />
              {resolveText('page.orderItems', 'Sản phẩm trong đơn ({{count}})', { count: tracking.items.length })}
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
            {resolveText('page.history', 'Lịch sử đơn hàng')}
          </h2>
          {timeline.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">{resolveText('page.emptyHistory', 'Chưa có cập nhật trạng thái nào.')}</p>
          ) : (
            <div className="relative">
              {/* Vertical guide line */}
              <div className="absolute left-[18px] top-4 bottom-4 w-px bg-slate-700" />
              {timeline.map((item, idx) => (
                <TimelineItem key={idx} item={item} isFirst={idx === 0} resolveText={resolveText} />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 pb-4">
          {resolveText('page.autoRefresh', 'Thông tin được cập nhật tự động khi có thay đổi. Không cần tải lại trang.')}
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
