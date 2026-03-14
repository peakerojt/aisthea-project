import { FormEvent, useEffect, useMemo, useState } from 'react';
import { publicTracking } from '@/common/services/tracking.service';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, ShieldCheck, ChevronRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TrackingLookupPage() {
  const { t } = useTranslation('pages', { keyPrefix: 'trackingLookup' });
  const [orderCode, setOrderCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const features = useMemo(
    () => [
      { icon: ShieldCheck, color: 'text-emerald-400', label: t('features.secureLookup') },
      { icon: Package, color: 'text-blue-400', label: t('features.realtimeUpdate') },
      { icon: Search, color: 'text-cyan-400', label: t('features.detailRoute') },
    ],
    [t],
  );

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) setError(state.error);
  }, [location.state]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimCode = orderCode.trim();
    const trimPhone = phone.trim();

    if (!trimCode) {
      setError(t('errors.enterOrderCode'));
      return;
    }
    if (!trimPhone) {
      setError(t('errors.enterPhone'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await publicTracking(trimCode, trimPhone);
      window.sessionStorage.setItem('publicTrackingLookup', JSON.stringify({ orderCode: trimCode, contact: trimPhone }));
      navigate(`/tracking/${(data as any).orderId}?orderCode=${encodeURIComponent(trimCode)}&phone=${encodeURIComponent(trimPhone)}`);
    } catch (err: unknown) {
      const requestError = err as { response?: { data?: { errorCode?: string } }; message?: string };
      const code = requestError?.response?.data?.errorCode;
      setError(code === 'TRACKING_NOT_FOUND' ? t('errors.notFound') : requestError.message || t('errors.lookupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

      <div className="fixed top-5 left-5 z-10">
        <button
          onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          {t('actions.backToOrders')}
        </button>
      </div>

      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-widest">
          <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
          {t('hero.badge')}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-tight">
          {t('hero.titlePrefix')}{' '}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">{t('hero.titleHighlight')}</span>
        </h1>
        <p className="text-slate-400 text-base max-w-sm mx-auto">{t('hero.description')}</p>
      </div>

      <div className="w-full max-w-md">
        <form onSubmit={onSubmit} className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">{t('form.orderCodeLabel')}</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="order-code"
                aria-label={t('form.orderCodeAria')}
                type="text"
                placeholder={t('form.orderCodePlaceholder')}
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">{t('form.phoneLabel')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="phone"
                aria-label={t('form.phoneAria')}
                type="tel"
                placeholder={t('form.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/8 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200"
                required
              />
            </div>
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('states.loading')}
              </>
            ) : (
              <>
                <Search className="size-4" />
                {t('actions.lookup')}
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
