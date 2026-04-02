import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ZodError } from 'zod';
import { api } from '@/common/utils/api';
import { orderApi } from '@/common/api/order.api';
import { setLatestOrderData } from '@/common/utils/orderSnapshot';
import { createOrderClientSchema } from '@/common/validation/schemas';
import { FieldErrorMap, mapZodFieldErrors } from '@/common/validation/errors';
import { CartItem } from '@/types';
import { OrderQuote } from '@/common/services/order.service';
import { CheckoutErrorField, CheckoutFormValues, CheckoutSessionUser } from '@/common/hooks/useCheckoutForm';

type ApiValidationError = {
  field?: string;
  message?: string;
};

type VnpayPaymentUrlResponse = {
  vnpUrl?: string;
  data?: {
    vnpUrl?: string;
  };
};

type UseCheckoutSubmitParams = {
  apiFieldToFormField: (field?: string) => CheckoutErrorField | null;
  appliedCouponCode: string | null;
  cart: CartItem[];
  fetchCart: () => Promise<void>;
  fetchQuote: (couponCodeOverride?: string | null) => Promise<OrderQuote | null>;
  formData: CheckoutFormValues;
  pricingQuote: OrderQuote | null;
  selectedCityCode: string;
  selectedShippingMethod: 'STANDARD';
  setError: (message: string) => void;
  setFieldValidationErrors: (errors: FieldErrorMap) => void;
  user: CheckoutSessionUser;
  validateForm: () => CheckoutFormValues | null;
};

export const getVnpayRedirectUrl = (response?: VnpayPaymentUrlResponse | null) =>
  response?.vnpUrl ?? response?.data?.vnpUrl;

export const useCheckoutSubmit = ({
  apiFieldToFormField,
  appliedCouponCode,
  cart,
  fetchCart,
  fetchQuote,
  formData,
  pricingQuote,
  selectedCityCode,
  selectedShippingMethod,
  setError,
  setFieldValidationErrors,
  user,
  validateForm,
}: UseCheckoutSubmitParams) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation('pages', { keyPrefix: 'checkout' });

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError(t('errors.emptyCart'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const validatedForm = validateForm();
    if (!validatedForm) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      if (!user) {
        setError(t('errors.loginRequired'));
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const currentQuote = pricingQuote ?? await fetchQuote();
      if (!currentQuote) {
        throw new Error(t('errors.placeOrderFailed'));
      }

      const payload = createOrderClientSchema.parse({
        paymentMethod: validatedForm.paymentMethod,
        customerName: validatedForm.fullName,
        customerEmail: validatedForm.email,
        customerPhone: validatedForm.phone,
        shippingCity: validatedForm.city,
        shippingDistrict: validatedForm.district,
        shippingWard: validatedForm.ward,
        shippingAddressDetail: validatedForm.address,
        note: validatedForm.note,
        items: cart.map((item) => ({
          variantId: Number(item.variantId),
          quantity: item.quantity,
        })),
        couponCode: appliedCouponCode ?? undefined,
        shippingCityCode: selectedCityCode,
        shippingMethod: selectedShippingMethod,
      });

      const data = await orderApi.createOrder<{
        orderId: number;
        pricing: {
          itemsTotal: number;
          shippingFee: number;
          discount: number;
          grandTotal: number;
          tax: number;
        };
        paymentMethod: string;
      }>(payload);

      const authoritativePricing = data.pricing ?? {
        itemsTotal: currentQuote.itemsSubtotal,
        shippingFee: currentQuote.shippingFee,
        discount: currentQuote.discountAmount,
        tax: 0,
        grandTotal: currentQuote.totalAmount,
      };

      setLatestOrderData({
        orderId: data.orderId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        district: formData.district,
        city: formData.city,
        ward: formData.ward,
        note: formData.note,
        paymentMethod: formData.paymentMethod as 'COD' | 'VNPAY',
        shippingMethod: selectedShippingMethod,
        shippingFee: authoritativePricing.shippingFee,
        discountValue: authoritativePricing.discount,
        subtotal: authoritativePricing.itemsTotal,
        total: authoritativePricing.grandTotal,
        items: cart,
      });

      try {
        await fetchCart();
      } catch (cartSyncError) {
        console.error('[Checkout] Failed to refresh cart after order creation:', cartSyncError);
      }

      if (formData.paymentMethod === 'VNPAY') {
        try {
          const vnpResponse = await api.post<VnpayPaymentUrlResponse>('/api/vnpay/create_payment_url', {
            orderId: data.orderId,
            orderDescription: `Thanh toan don hang ${data.orderId}`,
            orderType: 'other',
          });
          const vnpUrl = getVnpayRedirectUrl(vnpResponse);

          if (vnpUrl) {
            window.location.href = vnpUrl;
            return;
          }

          setError(t('errors.vnpayUrlFailed'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (vnpErr) {
          console.error('Failed to get VNPAY URL:', vnpErr);
          setError(t('errors.vnpayUrlFailed'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        navigate('/order-success');
      }
    } catch (err: unknown) {
      console.error('Order creation error:', err);
      const error = err as {
        message?: string;
        data?: { error?: string };
        details?: ApiValidationError[];
      };

      if (err instanceof ZodError) {
        const errors = mapZodFieldErrors(err);
        setFieldValidationErrors(errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (Array.isArray(error.details)) {
        const mappedErrors = error.details.reduce<FieldErrorMap>((acc, issue) => {
          const field = apiFieldToFormField(issue.field);
          if (!field || acc[field] || !issue.message) return acc;
          acc[field] = issue.message;
          return acc;
        }, {});

        if (Object.keys(mappedErrors).length > 0) {
          setFieldValidationErrors(mappedErrors);
        }
      }

      const errorMessage = error.message || error.data?.error || t('errors.placeOrderFailed');
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return {
    handlePlaceOrder,
    loading,
  };
};
