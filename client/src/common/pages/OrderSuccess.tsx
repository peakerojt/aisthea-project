import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useTranslation } from 'react-i18next';
import { CheckoutProgress } from '@/common/components/CheckoutProgress';
import { OrderSummaryRail } from '@/common/components/OrderSummaryRail';
import { formatCurrencyVND } from '@/common/utils/currency';
import { getLatestOrderData, LatestOrderData } from '@/common/utils/orderSnapshot';

const OrderSuccess: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderSuccess' });
  const { t: pagesT } = useTranslation('pages');
  const navigate = useNavigate();
  const fallbackOrderData: LatestOrderData = {
    items: [],
    note: '',
    shippingFee: 0,
    discountValue: 0,
    subtotal: 0,
    total: 0,
    fullName: t('fallback.customer'),
    email: t('fallback.unknown'),
    phone: t('fallback.unknown'),
    address: t('fallback.unknown'),
    district: t('fallback.unknown'),
    city: '',
    ward: '',
    paymentMethod: 'COD',
    shippingMethod: 'STANDARD',
  };
  const [orderData, setOrderData] = React.useState<LatestOrderData>(fallbackOrderData);

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

  React.useEffect(() => {
    const storedOrder = getLatestOrderData();
    if (storedOrder) {
      setOrderData(storedOrder);
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg-dark text-white overflow-hidden">
      <Header transparent={false} />
      <main className="relative mx-auto w-full max-w-[1280px] px-4 pb-28 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] bg-gradient-to-b from-emerald-900/10 to-transparent"></div>

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

          <div className="animate-fade-in-up rounded-sm border border-border-dark bg-surface-dark p-8 shadow-2xl lg:p-12">
            <div className="mb-10 flex flex-col gap-6 border-b border-border-dark pb-10 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500/30 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                  <span className="material-symbols-outlined text-5xl text-green-500">check</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-green-400">
                    {t('header.badge')}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{t('header.title')}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">{t('header.description')}</p>
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4 md:max-w-[260px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{t('status.title')}</p>
                <p className="mt-2 text-sm font-bold text-white">{t('status.value')}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('status.description')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{t('sections.customerInfo')}</h3>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p className="font-medium text-white">{orderData.fullName}</p>
                    <p>{orderData.email}</p>
                    <p>{orderData.phone}</p>
                  </div>
                </section>

                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{t('sections.paymentMethod')}</h3>
                  <p className="text-sm text-gray-300">
                    {orderData.paymentMethod === 'VNPAY' ? t('payment.vnpay') : t('payment.cod')}
                  </p>
                  {orderData.orderId && (
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/35">
                      {t('status.orderId', { orderId: orderData.orderId })}
                    </p>
                  )}
                </section>

                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5 md:col-span-2">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{t('sections.shippingAddress')}</h3>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p className="font-medium text-white">{orderData.fullName}</p>
                    <p>
                      {orderData.address}
                      {orderData.ward ? `, ${orderData.ward}` : ''}
                    </p>
                    <p>
                      {orderData.district ? `${orderData.district}, ` : ''}
                      {orderData.city}
                    </p>
                    <p>{orderData.phone}</p>
                  </div>
                </section>
              </div>

              <OrderSummaryRail
                title={t('summary.title', { count: orderData.items.length })}
                items={orderData.items}
                maxHeightClassName="max-h-[260px]"
              >
                <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('summary.subtotal')}</span>
                    <span className="font-medium text-white">{formatCurrencyVND(orderData.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('summary.shipping')}</span>
                    <span className={`font-medium ${orderData.shippingFee === 0 ? 'text-green-500' : 'text-white'}`}>
                      {orderData.shippingFee === 0 ? t('summary.freeShipping') : formatCurrencyVND(orderData.shippingFee)}
                    </span>
                  </div>
                  {orderData.discountValue > 0 && (
                    <div className="flex items-center justify-between text-green-400">
                      <span>{t('summary.discount')}</span>
                      <span>-{formatCurrencyVND(orderData.discountValue)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-border-dark pt-6">
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <p className="text-base font-bold uppercase tracking-tight">{t('summary.total')}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {orderData.shippingMethod === 'EXPRESS' ? t('shipping.express') : t('shipping.standard')}
                      </p>
                    </div>
                    <span className="text-2xl font-black tracking-tight text-primary">{formatCurrencyVND(orderData.total)}</span>
                  </div>

                  <div className="space-y-4 border-t border-border-dark pt-5">
                    <div>
                      <p className="text-sm font-bold text-white">{t('followUp.emailTitle')}</p>
                      <p className="mt-1 text-sm text-gray-300">{t('followUp.emailDescription')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t('followUp.ordersTitle')}</p>
                      <p className="mt-1 text-sm text-gray-300">{t('followUp.ordersDescription')}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/my-orders')}
                      className="h-12 w-full cursor-pointer bg-primary px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
                    >
                      {t('actions.viewOrders')}
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
        </div>
      </main>
    </div>
  );
};

export default OrderSuccess;
