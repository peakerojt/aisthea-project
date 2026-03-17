import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/common/utils/api';
import { useTranslation } from 'react-i18next';
import { Header } from '@/store/components/Header';
import { CheckoutProgress } from '@/common/components/CheckoutProgress';
import { OrderSummaryRail } from '@/common/components/OrderSummaryRail';
import { PaymentMethodLabel, PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';
import { formatCurrencyVND } from '@/common/utils/currency';
import { getLatestOrderData } from '@/common/utils/orderSnapshot';

const VNPAY_RETURN_CACHE_KEY = 'aisthea:vnpay-return-status';

type VNPayReturnCache = {
  status: 'loading' | 'success' | 'failed';
  message: string;
  paymentStatusCode: string;
  cachedAt: number;
};

export const VNPayReturn: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'vnpayReturn' });
  const { t: pagesT } = useTranslation('pages');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQueryRef = useRef(searchParams.toString());
  const hasVerifiedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState(t('states.loadingMessage'));
  const [paymentStatusCode, setPaymentStatusCode] = useState<string>('VERIFYING');
  const orderData = getLatestOrderData();

  const progressSteps = [
    {
      key: 'cart',
      label: pagesT('checkoutFlow.steps.cart.label'),
      hint: pagesT('checkoutFlow.steps.cart.hint'),
    },
    {
      key: 'checkout',
      label: pagesT('checkoutFlow.steps.checkout.label'),
      hint: pagesT('checkoutFlow.steps.checkout.hint'),
    },
    {
      key: 'success',
      label: pagesT('checkoutFlow.steps.success.label'),
      hint: pagesT('checkoutFlow.steps.success.hint'),
    },
  ];

  useEffect(() => {
    const verifyPayment = async () => {
      if (hasVerifiedRef.current) return;
      hasVerifiedRef.current = true;

      const queryString = initialQueryRef.current;
      if (!queryString) {
        try {
          const cachedRaw = sessionStorage.getItem(VNPAY_RETURN_CACHE_KEY);
          if (!cachedRaw) {
            setStatus('failed');
            setMessage(t('states.errorMessage'));
            setPaymentStatusCode('FAILED');
            return;
          }

          const cached = JSON.parse(cachedRaw) as VNPayReturnCache;
          const isExpired = !cached.cachedAt || Date.now() - cached.cachedAt > 10 * 60 * 1000;

          if (isExpired) {
            sessionStorage.removeItem(VNPAY_RETURN_CACHE_KEY);
            setStatus('failed');
            setMessage(t('states.errorMessage'));
            setPaymentStatusCode('FAILED');
            return;
          }

          setStatus(cached.status);
          setMessage(cached.message);
          setPaymentStatusCode(cached.paymentStatusCode);
        } catch {
          setStatus('failed');
          setMessage(t('states.errorMessage'));
          setPaymentStatusCode('FAILED');
        }
        return;
      }

      try {
        const data = await api.get<any>(`/api/vnpay/vnpay_return?${queryString}`);
        let nextStatus: 'loading' | 'success' | 'failed' = 'failed';
        let nextMessage = t('states.failedMessage');
        let nextPaymentStatus = data.paymentStatus || 'FAILED';

        if (data.paymentStatus === 'COMPLETED' && data.code === '00') {
          nextStatus = 'success';
          nextMessage = t('states.successMessage');
          nextPaymentStatus = 'COMPLETED';
        } else if (data.paymentStatus === 'PENDING' || data.code === 'PENDING') {
          nextStatus = 'loading';
          nextMessage = t('states.loadingMessage');
          nextPaymentStatus = data.paymentStatus || 'PENDING';
        }

        setStatus(nextStatus);
        setMessage(nextMessage);
        setPaymentStatusCode(nextPaymentStatus);
        sessionStorage.setItem(VNPAY_RETURN_CACHE_KEY, JSON.stringify({
          status: nextStatus,
          message: nextMessage,
          paymentStatusCode: nextPaymentStatus,
          cachedAt: Date.now(),
        } satisfies VNPayReturnCache));

        window.history.replaceState(window.history.state, '', window.location.pathname);
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage(t('states.errorMessage'));
        setPaymentStatusCode('FAILED');
        sessionStorage.setItem(VNPAY_RETURN_CACHE_KEY, JSON.stringify({
          status: 'failed',
          message: t('states.errorMessage'),
          paymentStatusCode: 'FAILED',
          cachedAt: Date.now(),
        } satisfies VNPayReturnCache));
        window.history.replaceState(window.history.state, '', window.location.pathname);
      }
    };

    verifyPayment();
  }, [t]);

  return (
    <div className="min-h-screen bg-bg-dark text-white overflow-hidden">
      <Header transparent={false} />
      <main className="relative mx-auto w-full max-w-[1280px] px-4 pb-28 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] bg-gradient-to-b from-blue-900/10 to-transparent"></div>

        <div className="relative z-10">
          <div className="mb-10">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              {t('meta.kicker')}
            </p>
            <div className="mb-5 border-b border-border-dark pb-6">
              <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
                {t('meta.title')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                {t('meta.subtitle')}
              </p>
            </div>
            <CheckoutProgress currentStep="success" steps={progressSteps} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="animate-fade-in-up rounded-sm border border-border-dark bg-surface-dark p-8 shadow-2xl lg:p-12">
              <div className="mb-8 flex flex-col gap-6 border-b border-border-dark pb-8 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  {status === 'loading' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-500/20 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.12)]">
                      <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                  )}
                  {status === 'success' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500/30 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                      <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
                    </div>
                  )}
                  {status === 'failed' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-500/30 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                      <span className="material-symbols-outlined text-5xl text-red-500">cancel</span>
                    </div>
                  )}

                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${status === 'success' ? 'text-green-400' : status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                      {status === 'success' ? t('status.badges.success') : status === 'failed' ? t('status.badges.failed') : t('status.badges.loading')}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{message}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
                      {status === 'success' ? t('descriptions.success') : status === 'failed' ? t('descriptions.failed') : t('descriptions.loading')}
                    </p>
                  </div>
                </div>

                {orderData?.orderId && (
                  <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4 md:max-w-[240px]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{t('status.orderLabel')}</p>
                    <p className="mt-2 text-sm font-bold text-white">#{orderData.orderId}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('status.orderHint')}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{t('sections.paymentStatus')}</h3>
                  <PaymentStatusBadge paymentMethod="VNPAY" paymentStatus={paymentStatusCode} uppercase />
                  <p className="mt-3 text-sm text-gray-400">{t(`sections.statusValues.${status}`)}</p>
                  <p className="mt-2 text-sm text-gray-400">{t('sections.paymentMethod')}</p>
                  <p className="mt-1 text-sm text-white">
                    <PaymentMethodLabel paymentMethod={orderData?.paymentMethod ?? 'VNPAY'} />
                  </p>
                </div>

                <div className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{t('sections.nextStepTitle')}</h3>
                  <p className="text-sm text-gray-300">
                    {status === 'success' ? t('sections.nextStepSuccess') : status === 'failed' ? t('sections.nextStepFailed') : t('sections.nextStepLoading')}
                  </p>
                </div>
              </div>
            </section>

            <OrderSummaryRail
              title={t('summary.title', { count: orderData?.items.length ?? 0 })}
              items={orderData?.items ?? []}
              maxHeightClassName="max-h-[260px]"
            >
              <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t('summary.subtotal')}</span>
                  <span className="font-medium text-white">{formatCurrencyVND(orderData?.subtotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t('summary.shipping')}</span>
                  <span className={`font-medium ${(orderData?.shippingFee ?? 0) === 0 ? 'text-green-500' : 'text-white'}`}>
                    {(orderData?.shippingFee ?? 0) === 0 ? t('summary.freeShipping') : formatCurrencyVND(orderData?.shippingFee ?? 0)}
                  </span>
                </div>
                {(orderData?.discountValue ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-green-400">
                    <span>{t('summary.discount')}</span>
                    <span>-{formatCurrencyVND(orderData?.discountValue ?? 0)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-border-dark pt-6">
                <div className="mb-6 flex items-end justify-between">
                  <span className="text-base font-bold uppercase tracking-tight">{t('summary.total')}</span>
                  <span className={`text-2xl font-black tracking-tight ${status === 'failed' ? 'text-white' : 'text-primary'}`}>
                    {formatCurrencyVND(orderData?.total ?? 0)}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {status === 'success' ? (
                    <button
                      onClick={() => navigate('/order-success')}
                      className="h-12 w-full cursor-pointer bg-primary px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
                    >
                      {t('actions.viewConfirmation')}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/checkout')}
                      className="h-12 w-full cursor-pointer bg-primary px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
                    >
                      {t('actions.retryCheckout')}
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/my-orders')}
                    className="h-12 w-full cursor-pointer border border-border-dark px-6 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-white hover:text-white"
                  >
                    {t('actions.manageOrders')}
                  </button>
                  <button
                    onClick={() => navigate('/collection')}
                    className="h-12 w-full cursor-pointer border border-border-dark px-6 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-white hover:text-white"
                  >
                    {t('actions.continueShopping')}
                  </button>
                </div>
              </div>
            </OrderSummaryRail>
          </div>
        </div>
      </main>
    </div>
  );
};
