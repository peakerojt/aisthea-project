import { FormEvent, useEffect, useMemo, useState } from 'react';
import { publicTracking } from '@/common/services/tracking.service';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, ShieldCheck, ChevronRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trackingLookupClientSchema } from '@/common/validation/schemas';

export function TrackingLookupPage() {
  const { t } = useTranslation('pages', { keyPrefix: 'trackingLookup' });
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as any, { ...(options ?? {}), defaultValue: fallback } as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [orderCodeError, setOrderCodeError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const backToOrdersLabel = resolveText('actions.backToOrders', 'Quay lại đơn hàng');
  const heroBadgeLabel = resolveText('hero.badge', 'Theo dõi đơn hàng');
  const heroTitlePrefix = resolveText('hero.titlePrefix', 'Tra cứu');
  const heroTitleHighlight = resolveText('hero.titleHighlight', 'vận đơn');
  const heroDescription = resolveText(
    'hero.description',
    'Nhập mã đơn và số điện thoại để xem trạng thái giao hàng mới nhất.',
  );
  const secureLookupLabel = resolveText('features.secureLookup', 'Tra cứu an toàn');
  const realtimeUpdateLabel = resolveText('features.realtimeUpdate', 'Cập nhật thời gian thực');
  const detailRouteLabel = resolveText('features.detailRoute', 'Lộ trình chi tiết');
  const orderCodeLabel = resolveText('form.orderCodeLabel', 'Mã đơn hàng');
  const orderCodeAria = resolveText('form.orderCodeAria', 'Nhập mã đơn hàng');
  const orderCodePlaceholder = resolveText('form.orderCodePlaceholder', 'Ví dụ: ORD-2026-001');
  const phoneLabel = resolveText('form.phoneLabel', 'Số điện thoại');
  const phoneAria = resolveText('form.phoneAria', 'Nhập số điện thoại');
  const phonePlaceholder = resolveText('form.phonePlaceholder', 'Ví dụ: 09xxxxxxxx');
  const loadingLabel = resolveText('states.loading', 'Đang tra cứu...');
  const lookupLabel = resolveText('actions.lookup', 'Xem trạng thái');
  const enterOrderCodeLabel = resolveText('errors.enterOrderCode', 'Vui lòng nhập mã đơn hàng.');
  const enterPhoneLabel = resolveText('errors.enterPhone', 'Vui lòng nhập số điện thoại.');
  const orderCodeInvalidLabel = resolveText('errors.orderCodeInvalid', 'Mã đơn hàng phải có ít nhất 4 ký tự.');
  const phoneInvalidLabel = resolveText('errors.phoneInvalid', 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
  const notFoundLabel = resolveText(
    'errors.notFound',
    'Không tìm thấy thông tin đơn hàng với dữ liệu đã nhập.',
  );
  const lookupFailedLabel = resolveText('errors.lookupFailed', 'Không thể tra cứu đơn hàng. Vui lòng thử lại.');

  const features = useMemo(
    () => [
      { icon: ShieldCheck, color: 'text-emerald-400', label: secureLookupLabel },
      { icon: Package, color: 'text-blue-400', label: realtimeUpdateLabel },
      { icon: Search, color: 'text-cyan-400', label: detailRouteLabel },
    ],
    [detailRouteLabel, realtimeUpdateLabel, secureLookupLabel],
  );

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) setError(state.error);
  }, [location.state]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = trackingLookupClientSchema.safeParse({ orderCode, contact: phone });

    if (!parsed.success) {
      const trimmedOrderCode = orderCode.trim();
      const trimmedPhone = phone.trim();
      const orderCodeIssue = parsed.error.issues.some((issue) => issue.path[0] === 'orderCode');
      const phoneIssue = parsed.error.issues.some((issue) => issue.path[0] === 'contact');

      setOrderCodeError(orderCodeIssue ? (!trimmedOrderCode ? enterOrderCodeLabel : orderCodeInvalidLabel) : '');
      setPhoneError(phoneIssue ? (!trimmedPhone ? enterPhoneLabel : phoneInvalidLabel) : '');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setOrderCodeError('');
    setPhoneError('');

    try {
      const data = await publicTracking(parsed.data.orderCode, parsed.data.contact);
      window.sessionStorage.setItem('publicTrackingLookup', JSON.stringify({ orderCode: parsed.data.orderCode, contact: parsed.data.contact }));
      navigate(`/tracking/${(data as any).orderId}?orderCode=${encodeURIComponent(parsed.data.orderCode)}&phone=${encodeURIComponent(parsed.data.contact)}`);
    } catch (err: unknown) {
      const requestError = err as Error & {
        code?: string;
        details?: Array<{ field?: string; message?: string }>;
      };

      if (Array.isArray(requestError.details)) {
        for (const issue of requestError.details) {
          if (issue.field === 'orderCode' && issue.message) {
            setOrderCodeError(issue.message);
          }

          if ((issue.field === 'contact' || issue.field === 'phone') && issue.message) {
            setPhoneError(issue.message);
          }
        }
      }

      setError(requestError.code === 'TRACKING_NOT_FOUND' ? notFoundLabel : requestError.message || lookupFailedLabel);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
    >
      <div className="fixed top-5 left-5 z-10">
        <button
          onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
          className="group flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 backdrop-blur-sm transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          {backToOrdersLabel}
        </button>
      </div>

      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
          <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
          {heroBadgeLabel}
        </div>
        <h1 className="mb-3 text-4xl font-black uppercase leading-tight tracking-tighter text-white sm:text-5xl">
          {heroTitlePrefix}{' '}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">{heroTitleHighlight}</span>
        </h1>
        <p className="text-slate-400 text-base max-w-sm mx-auto">{heroDescription}</p>
      </div>

      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          noValidate
          className="relative rounded-2xl border border-white/10 bg-black/30 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,23,36,0.92) 0%, rgba(8,12,20,0.92) 100%)',
          }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">{orderCodeLabel}</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="order-code"
                aria-label={orderCodeAria}
                type="text"
                placeholder={orderCodePlaceholder}
                value={orderCode}
                onChange={(e) => {
                  setOrderCode(e.target.value);
                  setOrderCodeError('');
                  setError(null);
                }}
                className={`w-full rounded-xl border bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-all duration-200 focus:bg-white/[0.07] focus:outline-none focus:ring-1 ${orderCodeError ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/20' : 'border-white/10 focus:border-blue-500/60 focus:ring-blue-500/30'}`}
                required
              />
            </div>
            {orderCodeError && <p className="mt-2 text-xs text-red-400">{orderCodeError}</p>}
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-300">{phoneLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="phone"
                aria-label={phoneAria}
                type="tel"
                placeholder={phonePlaceholder}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                  setError(null);
                }}
                className={`w-full rounded-xl border bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-all duration-200 focus:bg-white/[0.07] focus:outline-none focus:ring-1 ${phoneError ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/20' : 'border-white/10 focus:border-blue-500/60 focus:ring-blue-500/30'}`}
                required
              />
            </div>
            {phoneError && <p className="mt-2 text-xs text-red-400">{phoneError}</p>}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                <Search className="size-4" />
                {lookupLabel}
                <ChevronRight className="size-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
          {features.map(({ icon: Icon, color, label }) => (
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
