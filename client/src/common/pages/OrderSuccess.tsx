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
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as any, { ...(options ?? {}), defaultValue: fallback } as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const resolvePagesText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = pagesT(key as any, { ...(options ?? {}), defaultValue: fallback } as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const customerFallbackLabel = resolveText('fallback.customer', 'Khách hàng');
  const unknownFallbackLabel = resolveText('fallback.unknown', 'Không rõ');
  const metaKickerLabel = resolveText('meta.kicker', 'Bước 3 · Hoàn tất đơn hàng');
  const metaTitleLabel = resolveText('meta.title', 'Xác nhận đơn hàng');
  const metaSubtitleLabel = resolveText(
    'meta.subtitle',
    'Đơn của bạn đã được ghi nhận. Mọi cập nhật tiếp theo sẽ hiển thị trong lịch sử đơn hàng và các kênh thông báo khả dụng.',
  );
  const headerBadgeLabel = resolveText('header.badge', 'Đã xác nhận');
  const headerTitleLabel = resolveText('header.title', 'Cảm ơn bạn đã đặt hàng!');
  const headerDescriptionLabel = resolveText(
    'header.description',
    'Đơn hàng đang chờ xác nhận. Bạn có thể theo dõi trạng thái mới nhất trong tài khoản của mình bất cứ lúc nào.',
  );
  const statusTitleLabel = resolveText('status.title', 'Trạng thái');
  const statusValueLabel = resolveText('status.value', 'Đơn hàng đang chờ xác nhận');
  const statusDescriptionLabel = resolveText(
    'status.description',
    'Chúng tôi sẽ xác nhận đơn, chuẩn bị sản phẩm và cập nhật vận chuyển trong mục đơn hàng của bạn.',
  );
  const customerInfoLabel = resolveText('sections.customerInfo', 'Thông tin mua hàng');
  const paymentMethodLabel = resolveText('sections.paymentMethod', 'Phương thức thanh toán');
  const shippingAddressLabel = resolveText('sections.shippingAddress', 'Địa chỉ nhận hàng');
  const paymentVnpayLabel = resolveText('payment.vnpay', 'Thanh toán qua VNPAY-QR');
  const paymentCodLabel = resolveText('payment.cod', 'Thanh toán khi giao hàng (COD)');
  const shippingStandardLabel = resolveText('shipping.standard', 'Giao hàng tận nơi (Tiêu chuẩn)');
  const shippingExpressLabel = resolveText('shipping.express', 'Giao hàng hỏa tốc');
  const emailTitleLabel = resolveText('followUp.emailTitle', 'Theo dõi cập nhật đơn hàng');
  const emailDescriptionLabel = resolveText(
    'followUp.emailDescription',
    'Chúng tôi sẽ hiển thị các cập nhật mới nhất trong tài khoản của bạn và có thể gửi thêm thông báo khi tính năng khả dụng.',
  );
  const ordersTitleLabel = resolveText('followUp.ordersTitle', 'Theo dõi tiến độ trong đơn hàng');
  const ordersDescriptionLabel = resolveText(
    'followUp.ordersDescription',
    'Bạn có thể xem trạng thái xử lý, vận chuyển và lịch sử cập nhật ngay trong tài khoản.',
  );
  const viewOrdersLabel = resolveText('actions.viewOrders', 'Xem đơn hàng');
  const continueShoppingLabel = resolveText('actions.continueShopping', 'Tiếp tục mua hàng');
  const summaryTitleLabel = resolveText('summary.title', 'Đơn hàng ({{count}} sản phẩm)', { count: 0 });
  const summarySubtotalLabel = resolveText('summary.subtotal', 'Tạm tính');
  const summaryShippingLabel = resolveText('summary.shipping', 'Vận chuyển');
  const summaryFreeShippingLabel = resolveText('summary.freeShipping', 'Miễn phí');
  const summaryDiscountLabel = resolveText('summary.discount', 'Giảm giá');
  const summaryTotalLabel = resolveText('summary.total', 'Tổng cộng');
  const fallbackOrderData: LatestOrderData = {
    items: [],
    note: '',
    shippingFee: 0,
    discountValue: 0,
    subtotal: 0,
    total: 0,
    fullName: customerFallbackLabel,
    email: unknownFallbackLabel,
    phone: unknownFallbackLabel,
    address: unknownFallbackLabel,
    district: unknownFallbackLabel,
    city: '',
    ward: '',
    paymentMethod: 'COD',
    shippingMethod: 'STANDARD',
  };
  const [orderData, setOrderData] = React.useState<LatestOrderData>(fallbackOrderData);

  const progressSteps = [
    {
      key: 'cart',
      label: resolvePagesText('checkoutFlow.steps.cart.label', 'Giỏ hàng'),
      hint: resolvePagesText('checkoutFlow.steps.cart.hint', 'Kiểm tra sản phẩm và số lượng'),
    },
    {
      key: 'checkout',
      label: resolvePagesText('checkoutFlow.steps.checkout.label', 'Thanh toán'),
      hint: resolvePagesText('checkoutFlow.steps.checkout.hint', 'Điền thông tin và chọn phương thức'),
    },
    {
      key: 'success',
      label: resolvePagesText('checkoutFlow.steps.success.label', 'Hoàn tất'),
      hint: resolvePagesText('checkoutFlow.steps.success.hint', 'Xác nhận đơn và theo dõi trạng thái'),
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
              {metaKickerLabel}
            </p>
            <div className="mb-5 border-b border-border-dark pb-6">
              <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
                {metaTitleLabel}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                {metaSubtitleLabel}
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
                    {headerBadgeLabel}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{headerTitleLabel}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">{headerDescriptionLabel}</p>
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4 md:max-w-[260px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{statusTitleLabel}</p>
                <p className="mt-2 text-sm font-bold text-white">{statusValueLabel}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{statusDescriptionLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{customerInfoLabel}</h3>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p className="font-medium text-white">{orderData.fullName}</p>
                    <p>{orderData.email}</p>
                    <p>{orderData.phone}</p>
                  </div>
                </section>

                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{paymentMethodLabel}</h3>
                  <p className="text-sm text-gray-300">
                    {orderData.paymentMethod === 'VNPAY' ? paymentVnpayLabel : paymentCodLabel}
                  </p>
                  {orderData.orderId && (
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/35">
                      {resolveText('status.orderId', 'Mã đơn #{{orderId}}', { orderId: orderData.orderId })}
                    </p>
                  )}
                </section>

                <section className="rounded-sm border border-border-dark bg-white/[0.02] p-5 md:col-span-2">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{shippingAddressLabel}</h3>
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
                title={resolveText('summary.title', summaryTitleLabel, { count: orderData.items.length })}
                items={orderData.items}
                maxHeightClassName="max-h-[260px]"
              >
                <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{summarySubtotalLabel}</span>
                    <span className="font-medium text-white">{formatCurrencyVND(orderData.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{summaryShippingLabel}</span>
                    <span className={`font-medium ${orderData.shippingFee === 0 ? 'text-green-500' : 'text-white'}`}>
                      {orderData.shippingFee === 0 ? summaryFreeShippingLabel : formatCurrencyVND(orderData.shippingFee)}
                    </span>
                  </div>
                  {orderData.discountValue > 0 && (
                    <div className="flex items-center justify-between text-green-400">
                      <span>{summaryDiscountLabel}</span>
                      <span>-{formatCurrencyVND(orderData.discountValue)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-border-dark pt-6">
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <p className="text-base font-bold uppercase tracking-tight">{summaryTotalLabel}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                        {orderData.shippingMethod === 'EXPRESS' ? shippingExpressLabel : shippingStandardLabel}
                      </p>
                    </div>
                    <span className="text-2xl font-black tracking-tight text-primary">{formatCurrencyVND(orderData.total)}</span>
                  </div>

                  <div className="space-y-4 border-t border-border-dark pt-5">
                    <div>
                      <p className="text-sm font-bold text-white">{emailTitleLabel}</p>
                      <p className="mt-1 text-sm text-gray-300">{emailDescriptionLabel}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{ordersTitleLabel}</p>
                      <p className="mt-1 text-sm text-gray-300">{ordersDescriptionLabel}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/my-orders')}
                      className="h-12 w-full cursor-pointer bg-primary px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
                    >
                      {viewOrdersLabel}
                    </button>
                    <button
                      onClick={() => navigate('/collection')}
                      className="h-12 w-full cursor-pointer border border-border-dark px-6 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-white hover:text-white"
                    >
                      {continueShoppingLabel}
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
