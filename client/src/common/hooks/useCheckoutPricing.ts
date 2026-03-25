import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { orderApi } from '@/common/api/order.api';
import { validateCouponClientSchema, quoteOrderClientSchema } from '@/common/validation/schemas';
import { CartItem } from '@/types';
import { OrderQuote } from '@/common/services/order.service';
import { CheckoutSessionUser } from '@/common/hooks/useCheckoutForm';

type UseCheckoutPricingParams = {
  cart: CartItem[];
  selectedCityCode: string;
  selectedShippingMethod: 'STANDARD';
  subtotal: number;
  user: CheckoutSessionUser;
};

const getZone = (cityCode: string) => {
  if (!cityCode) return 0;
  if (cityCode === '48') return 1;
  if (['46', '49', '51'].includes(cityCode)) return 2;
  return 3;
};

const getShippingPreviewFee = (method: 'STANDARD' | 'EXPRESS', currentZone: number, cartSubtotal: number) => {
  if (currentZone === 0) return 0;

  let fee = 0;
  if (currentZone === 1) {
    fee = method === 'STANDARD' ? 15000 : 30000;
  } else if (currentZone === 2) {
    fee = method === 'STANDARD' ? 25000 : 40000;
  } else {
    fee = method === 'STANDARD' ? 40000 : 70000;
  }

  if (method === 'STANDARD' && cartSubtotal > 500000) {
    return 0;
  }

  return fee;
};

const buildFallbackQuote = ({
  subtotal,
  selectedCityCode,
  selectedShippingMethod,
}: Pick<UseCheckoutPricingParams, 'subtotal' | 'selectedCityCode' | 'selectedShippingMethod'>): OrderQuote => ({
  itemsSubtotal: subtotal,
  shippingFee: 0,
  discountAmount: 0,
  totalAmount: subtotal,
  shippingMethod: selectedShippingMethod,
  shippingCityCode: selectedCityCode || null,
  appliedCouponCode: null,
  coupon: null,
});

export const useCheckoutPricing = ({
  cart,
  selectedCityCode,
  selectedShippingMethod,
  subtotal,
  user,
}: UseCheckoutPricingParams) => {
  const { t } = useTranslation('pages', { keyPrefix: 'checkout' });
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [pricingQuote, setPricingQuote] = useState<OrderQuote | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  const fetchQuote = useCallback(async (couponCodeOverride?: string | null) => {
    if (!user || cart.length === 0) {
      return null;
    }

    const payload = quoteOrderClientSchema.parse({
      items: cart.map((item) => ({
        variantId: Number(item.variantId),
        quantity: item.quantity,
      })),
      couponCode: couponCodeOverride ?? appliedCouponCode ?? undefined,
      shippingCityCode: selectedCityCode || undefined,
      shippingMethod: selectedShippingMethod,
    });

    return orderApi.quoteOrder(payload);
  }, [appliedCouponCode, cart, selectedCityCode, selectedShippingMethod, user]);

  useEffect(() => {
    let cancelled = false;

    if (cart.length === 0) {
      setPricingQuote(null);
      setAppliedCouponCode(null);
      setCouponError('');
      setCouponSuccessMsg('');
      return;
    }

    if (!user || !selectedCityCode) {
      setPricingQuote(buildFallbackQuote({ subtotal, selectedCityCode, selectedShippingMethod }));
      return;
    }

    const syncQuote = async () => {
      setIsQuoteLoading(true);

      try {
        const quote = await fetchQuote();
        if (cancelled || !quote) return;
        setPricingQuote(quote);
        setCouponError('');
      } catch (err: unknown) {
        if (cancelled) return;

        const errorMessage = err instanceof Error ? err.message : t('errors.placeOrderFailed');

        if (appliedCouponCode) {
          setCouponError(errorMessage || t('coupon.invalidCode'));
          setCouponSuccessMsg('');
          setAppliedCouponCode(null);

          try {
            const fallbackQuote = await fetchQuote(null);
            if (!cancelled && fallbackQuote) {
              setPricingQuote(fallbackQuote);
            }
          } catch {
            if (!cancelled) {
              setPricingQuote(buildFallbackQuote({ subtotal, selectedCityCode, selectedShippingMethod }));
            }
          }
        } else {
          setCouponError('');
          setPricingQuote(buildFallbackQuote({ subtotal, selectedCityCode, selectedShippingMethod }));
        }
      } finally {
        if (!cancelled) {
          setIsQuoteLoading(false);
        }
      }
    };

    void syncQuote();

    return () => {
      cancelled = true;
    };
  }, [appliedCouponCode, cart.length, fetchQuote, selectedCityCode, selectedShippingMethod, subtotal, t, user]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const codeToUse = typeof codeToApply === 'string' ? codeToApply : couponInput;
    if (!codeToUse.trim()) return;

    if (!selectedCityCode) {
      setCouponError(t('shipping.selectProvinceFirst'));
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccessMsg('');

    try {
      const normalizedCoupon = validateCouponClientSchema.parse({
        code: codeToUse,
        cartSubtotal: subtotal,
      });
      const quote = await fetchQuote(normalizedCoupon.code);
      if (!quote?.coupon) {
        throw new Error(t('coupon.invalidCode'));
      }

      setPricingQuote(quote);
      setAppliedCouponCode(quote.appliedCouponCode);
      setCouponSuccessMsg('');
      setCouponInput('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('coupon.invalidCode');
      setCouponError(errorMessage || t('coupon.invalidCode'));
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null);
    setCouponError('');
    setCouponSuccessMsg('');
  };

  const zone = useMemo(() => getZone(selectedCityCode), [selectedCityCode]);
  const shippingFee = pricingQuote?.shippingFee ?? 0;
  const discountValue = pricingQuote?.discountAmount ?? 0;
  const total = pricingQuote?.totalAmount ?? subtotal;
  const standardPreviewFee = pricingQuote
    ? pricingQuote.shippingFee
    : getShippingPreviewFee('STANDARD', zone, subtotal);
  const appliedCoupon = pricingQuote?.coupon ?? null;

  return {
    appliedCoupon,
    appliedCouponCode,
    couponError,
    couponInput,
    couponSuccessMsg,
    discountValue,
    fetchQuote,
    handleApplyCoupon,
    handleRemoveCoupon,
    isApplyingCoupon,
    isQuoteLoading,
    pricingQuote,
    setCouponInput,
    shippingFee,
    standardPreviewFee,
    total,
  };
};
