import { CheckoutSectionCard } from '@/common/components/CheckoutSectionCard';
import { CheckoutPaymentSectionProps } from '@/common/types/checkout.types';

export const CheckoutPaymentSection = ({
  formData,
  handleInputChange,
  t,
  vnpayLogo,
}: CheckoutPaymentSectionProps) => {
  const resolveText = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  return (
    <CheckoutSectionCard
      title={resolveText('sections.payment', 'Thanh toán')}
      description={resolveText('descriptions.payment', 'Chọn phương thức thanh toán phù hợp cho đơn hàng của bạn.')}
      style={{ animationDelay: '0.3s' }}
    >
      <fieldset className="overflow-hidden rounded-sm border border-border-dark bg-surface-dark">
        <legend className="sr-only">{resolveText('labels.paymentMethod', 'Phương thức thanh toán')}</legend>
        <label className={`flex cursor-pointer items-center justify-between p-4 transition-colors focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/60 ${formData.paymentMethod === 'VNPAY' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
          <div className="flex items-center gap-3">
            <input
              id="checkout-payment-vnpay"
              type="radio"
              name="paymentMethod"
              value="VNPAY"
              checked={formData.paymentMethod === 'VNPAY'}
              onChange={handleInputChange}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-medium">{resolveText('payment.vnpay', 'Thanh toán qua VNPAY')}</span>
          </div>
          <img src={vnpayLogo} alt="VNPAY" className="h-6 w-auto object-contain" />
        </label>

        <div className="h-[1px] w-full bg-border-dark"></div>

        <label className={`flex cursor-pointer items-center justify-between p-4 transition-colors focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/60 ${formData.paymentMethod === 'COD' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
          <div className="flex items-center gap-3">
            <input
              id="checkout-payment-cod"
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={formData.paymentMethod === 'COD'}
              onChange={handleInputChange}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-medium">{resolveText('payment.cod', 'Thanh toán khi nhận hàng')}</span>
          </div>
          <span className="material-symbols-outlined text-gray-400">local_shipping</span>
        </label>
      </fieldset>
    </CheckoutSectionCard>
  );
};
