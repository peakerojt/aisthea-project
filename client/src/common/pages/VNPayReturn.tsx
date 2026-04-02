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
import { getPaymentStatusMeta, type PaymentDisplayStatus } from '@/common/utils/paymentStatus';

const VNPAY_RETURN_CACHE_KEY = 'aisthea:vnpay-return-status';

type VNPayReturnCache = {
  status: 'loading' | 'success' | 'failed';
  message: string;
  paymentStatusCode: PaymentDisplayStatus;
  cachedAt: number;
};

const normalizeGatewayCode = (value: string | null | undefined) =>
  value?.trim().replace(/[\s-]+/g, '_').toUpperCase() ?? '';

export const VNPayReturn: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'vnpayReturn' });
  const { t: pagesT } = useTranslation('pages');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const resolvePagesText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = pagesT(key, { ...(options ?? {}), defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQueryRef = useRef(searchParams.toString());
  const hasVerifiedRef = useRef(false);
  const loadingMessageLabel = resolveText('states.loadingMessage', 'Đang xác thực kết quả thanh toán...');
  const successMessageLabel = resolveText('states.successMessage', 'Thanh toán VNPAY thành công!');
  const failedMessageLabel = resolveText('states.failedMessage', 'Thanh toán thất bại hoặc đã bị hủy.');
  const errorMessageLabel = resolveText('states.errorMessage', 'Lỗi khi xác thực thanh toán VNPAY.');
  const metaKickerLabel = resolveText('meta.kicker', 'Hoàn tất xác thực thanh toán');
  const metaTitleLabel = resolveText('meta.title', 'Kết quả thanh toán VNPAY');
  const metaSubtitleLabel = resolveText(
    'meta.subtitle',
    'Chúng tôi đang đồng bộ trạng thái thanh toán với đơn hàng của bạn để đảm bảo thông tin hiển thị chính xác.',
  );
  const statusBadgeLoadingLabel = resolveText('status.badges.loading', 'Đang xác thực');
  const statusBadgeSuccessLabel = resolveText('status.badges.success', 'Thanh toán thành công');
  const statusBadgeFailedLabel = resolveText('status.badges.failed', 'Cần xử lý lại');
  const orderLabel = resolveText('status.orderLabel', 'Mã đơn');
  const orderHintLabel = resolveText('status.orderHint', 'Bạn có thể theo dõi tiếp trong mục đơn hàng.');
  const successDescriptionLabel = resolveText(
    'descriptions.success',
    'Cảm ơn bạn đã sử dụng dịch vụ. Đơn hàng của bạn sẽ được xử lý trong thời gian sớm nhất.',
  );
  const failedDescriptionLabel = resolveText(
    'descriptions.failed',
    'Vui lòng thử lại hoặc chọn một phương thức thanh toán khác.',
  );
  const loadingDescriptionLabel = resolveText(
    'descriptions.loading',
    'Quá trình xác thực có thể mất vài giây. Vui lòng không đóng trình duyệt trong lúc hệ thống đồng bộ.',
  );
  const paymentStatusLabel = resolveText('sections.paymentStatus', 'Trạng thái thanh toán');
  const paymentMethodLabel = resolveText('sections.paymentMethod', 'Phương thức thanh toán');
  const nextStepTitleLabel = resolveText('sections.nextStepTitle', 'Tiếp theo');
  const nextStepSuccessLabel = resolveText(
    'sections.nextStepSuccess',
    'Thanh toán đã được ghi nhận. Bạn có thể xem xác nhận đơn hàng hoặc theo dõi trạng thái xử lý trong tài khoản.',
  );
  const nextStepFailedLabel = resolveText(
    'sections.nextStepFailed',
    'Bạn có thể quay lại checkout để thử lại thanh toán hoặc chọn phương thức khác mà không cần xây lại giỏ hàng.',
  );
  const nextStepLoadingLabel = resolveText(
    'sections.nextStepLoading',
    'Chờ hệ thống xác nhận với VNPAY. Ngay khi hoàn tất, thông tin đơn hàng sẽ được cập nhật đầy đủ.',
  );
  const loadingStatusValueLabel = resolveText(
    'sections.statusValues.loading',
    'Đang chờ kết quả từ cổng thanh toán',
  );
  const successStatusValueLabel = resolveText(
    'sections.statusValues.success',
    'Thanh toán đã được xác nhận',
  );
  const failedStatusValueLabel = resolveText(
    'sections.statusValues.failed',
    'Thanh toán chưa hoàn tất',
  );
  const summaryTitleLabel = resolveText('summary.title', 'Đơn hàng ({{count}} sản phẩm)', { count: 0 });
  const summarySubtotalLabel = resolveText('summary.subtotal', 'Tạm tính');
  const summaryShippingLabel = resolveText('summary.shipping', 'Vận chuyển');
  const summaryFreeShippingLabel = resolveText('summary.freeShipping', 'Miễn phí');
  const summaryDiscountLabel = resolveText('summary.discount', 'Giảm giá');
  const summaryTotalLabel = resolveText('summary.total', 'Tổng cộng');
  const viewConfirmationLabel = resolveText('actions.viewConfirmation', 'Xem xác nhận đơn');
  const retryCheckoutLabel = resolveText('actions.retryCheckout', 'Quay lại thanh toán');
  const manageOrdersLabel = resolveText('actions.manageOrders', 'Quản lý đơn hàng');
  const continueShoppingLabel = resolveText('actions.continueShopping', 'Tiếp tục mua hàng');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState(loadingMessageLabel);
  const [paymentStatusCode, setPaymentStatusCode] = useState<PaymentDisplayStatus>('VERIFYING');
  const orderData = getLatestOrderData();

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
            setMessage(errorMessageLabel);
            setPaymentStatusCode('FAILED');
            return;
          }

          const cached = JSON.parse(cachedRaw) as VNPayReturnCache;
          const isExpired = !cached.cachedAt || Date.now() - cached.cachedAt > 10 * 60 * 1000;

          if (isExpired) {
            sessionStorage.removeItem(VNPAY_RETURN_CACHE_KEY);
            setStatus('failed');
            setMessage(errorMessageLabel);
            setPaymentStatusCode('FAILED');
            return;
          }

          setStatus(cached.status);
          setMessage(cached.message);
          setPaymentStatusCode(getPaymentStatusMeta('VNPAY', cached.paymentStatusCode).canonicalStatus);
        } catch {
          setStatus('failed');
          setMessage(errorMessageLabel);
          setPaymentStatusCode('FAILED');
        }
        return;
      }

      try {
        const data = await api.get<any>(`/api/vnpay/vnpay_return?${queryString}`);
        const canonicalPaymentStatus = getPaymentStatusMeta('VNPAY', data.paymentStatus).canonicalStatus;
        const normalizedCode = normalizeGatewayCode(data.code);
        let nextStatus: 'loading' | 'success' | 'failed' = 'failed';
        let nextMessage =
          canonicalPaymentStatus === 'NEEDS_REVIEW'
            ? resolveText('states.reviewMessage', 'Thanh toán cần được kiểm tra thêm.')
            : canonicalPaymentStatus === 'CANCELLED'
              ? resolveText('states.cancelledMessage', 'Thanh toán đã bị hủy.')
              : failedMessageLabel;
        let nextPaymentStatus: PaymentDisplayStatus = canonicalPaymentStatus === 'UNKNOWN' ? 'FAILED' : canonicalPaymentStatus;

        if (canonicalPaymentStatus === 'PAID' && normalizedCode === '00') {
          nextStatus = 'success';
          nextMessage = successMessageLabel;
          nextPaymentStatus = 'PAID';
        } else if (
          canonicalPaymentStatus === 'PENDING' ||
          canonicalPaymentStatus === 'PENDING_VNPAY' ||
          canonicalPaymentStatus === 'VERIFYING' ||
          normalizedCode === 'PENDING'
        ) {
          nextStatus = 'loading';
          nextMessage = loadingMessageLabel;
          nextPaymentStatus = canonicalPaymentStatus === 'UNKNOWN' ? 'PENDING_VNPAY' : canonicalPaymentStatus;
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
        setMessage(errorMessageLabel);
        setPaymentStatusCode('FAILED');
        sessionStorage.setItem(VNPAY_RETURN_CACHE_KEY, JSON.stringify({
          status: 'failed',
          message: errorMessageLabel,
          paymentStatusCode: 'FAILED',
          cachedAt: Date.now(),
        } satisfies VNPayReturnCache));
        window.history.replaceState(window.history.state, '', window.location.pathname);
      }
    };

    verifyPayment();
  }, [errorMessageLabel, failedMessageLabel, loadingMessageLabel, successMessageLabel]);

  return (
    <div className="min-h-screen bg-bg-dark text-white overflow-hidden">
      <Header transparent={false} />
      <main className="relative mx-auto w-full max-w-[1280px] px-4 pb-28 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] bg-gradient-to-b from-blue-900/10 to-transparent"></div>

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
                      {status === 'success'
                        ? statusBadgeSuccessLabel
                        : status === 'failed'
                          ? statusBadgeFailedLabel
                          : statusBadgeLoadingLabel}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{message}</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
                      {status === 'success'
                        ? successDescriptionLabel
                        : status === 'failed'
                          ? failedDescriptionLabel
                          : loadingDescriptionLabel}
                    </p>
                  </div>
                </div>

                {orderData?.orderId && (
                  <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4 md:max-w-[240px]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">{orderLabel}</p>
                    <p className="mt-2 text-sm font-bold text-white">#{orderData.orderId}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{orderHintLabel}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{paymentStatusLabel}</h3>
                  <PaymentStatusBadge paymentMethod="VNPAY" paymentStatus={paymentStatusCode} uppercase />
                  <p className="mt-3 text-sm text-gray-400">
                    {status === 'success'
                      ? successStatusValueLabel
                      : status === 'failed'
                        ? failedStatusValueLabel
                        : loadingStatusValueLabel}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">{paymentMethodLabel}</p>
                  <p className="mt-1 text-sm text-white">
                    <PaymentMethodLabel paymentMethod={orderData?.paymentMethod ?? 'VNPAY'} />
                  </p>
                </div>

                <div className="rounded-sm border border-border-dark bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">{nextStepTitleLabel}</h3>
                  <p className="text-sm text-gray-300">
                    {status === 'success'
                      ? nextStepSuccessLabel
                      : status === 'failed'
                        ? nextStepFailedLabel
                        : nextStepLoadingLabel}
                  </p>
                </div>
              </div>
            </section>

            <OrderSummaryRail
              title={resolveText('summary.title', summaryTitleLabel, { count: orderData?.items.length ?? 0 })}
              items={orderData?.items ?? []}
              maxHeightClassName="max-h-[260px]"
            >
              <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{summarySubtotalLabel}</span>
                  <span className="font-medium text-white">{formatCurrencyVND(orderData?.subtotal ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{summaryShippingLabel}</span>
                  <span className={`font-medium ${(orderData?.shippingFee ?? 0) === 0 ? 'text-green-500' : 'text-white'}`}>
                    {(orderData?.shippingFee ?? 0) === 0 ? summaryFreeShippingLabel : formatCurrencyVND(orderData?.shippingFee ?? 0)}
                  </span>
                </div>
                {(orderData?.discountValue ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-green-400">
                    <span>{summaryDiscountLabel}</span>
                    <span>-{formatCurrencyVND(orderData?.discountValue ?? 0)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-border-dark pt-6">
                <div className="mb-6 flex items-end justify-between">
                  <span className="text-base font-bold uppercase tracking-tight">{summaryTotalLabel}</span>
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
                      {viewConfirmationLabel}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/checkout')}
                      className="h-12 w-full cursor-pointer bg-primary px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
                    >
                      {retryCheckoutLabel}
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/my-orders')}
                    className="h-12 w-full cursor-pointer border border-border-dark px-6 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-white hover:text-white"
                  >
                    {manageOrdersLabel}
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
      </main>
    </div>
  );
};
