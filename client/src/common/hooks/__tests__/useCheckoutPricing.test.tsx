import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const quoteOrderMock = vi.fn();
const translateMock = vi.fn((key: string) => key);

vi.mock('@/common/api/order.api', () => ({
  orderApi: {
    quoteOrder: (...args: unknown[]) => quoteOrderMock(...args),
  },
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: translateMock,
      i18n: { changeLanguage: vi.fn() },
    }),
  };
});

type UseCheckoutPricing = typeof import('@/common/hooks/useCheckoutPricing').useCheckoutPricing;

const makeCartItem = (overrides?: Record<string, unknown>) => ({
  id: 'cart-1',
  variantId: 101,
  name: 'Basic Tee',
  price: 300000,
  image: '/tee.png',
  color: 'Black',
  size: 'M',
  quantity: 2,
  ref: 'TEE-001',
  ...overrides,
});

const makeQuote = (overrides?: Record<string, unknown>) => ({
  itemsSubtotal: 600000,
  shippingFee: 0,
  discountAmount: 30000,
  totalAmount: 570000,
  shippingMethod: 'STANDARD',
  shippingCityCode: '48',
  appliedCouponCode: 'SPRING',
  coupon: {
    couponId: 1,
    code: 'SPRING',
    type: 'PERCENT',
    value: 5,
  },
  ...overrides,
});

let useCheckoutPricing: UseCheckoutPricing;

describe('useCheckoutPricing', () => {
  beforeAll(async () => {
    ({ useCheckoutPricing } = await import('@/common/hooks/useCheckoutPricing'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    translateMock.mockImplementation((key: string) => key);
  });

  const renderUseCheckoutPricing = (overrides?: Partial<Parameters<UseCheckoutPricing>[0]>) => {
    const params: Parameters<UseCheckoutPricing>[0] = {
      cart: [makeCartItem()],
      selectedCityCode: '48',
      selectedShippingMethod: 'STANDARD',
      subtotal: 600000,
      user: { id: '1' },
      ...overrides,
    };

    return renderHook(() => useCheckoutPricing(params));
  };

  it('syncs pricing quote on mount for authenticated users with a selected city', async () => {
    quoteOrderMock.mockResolvedValue(makeQuote());

    const { result } = renderUseCheckoutPricing();

    await waitFor(() => {
      expect(result.current.isQuoteLoading).toBe(false);
      expect(result.current.pricingQuote).toEqual(makeQuote());
      expect(result.current.shippingFee).toBe(0);
      expect(result.current.discountValue).toBe(30000);
      expect(result.current.total).toBe(570000);
      expect(result.current.appliedCouponCode).toBeNull();
    });

    expect(quoteOrderMock).toHaveBeenCalledWith({
      items: [{ variantId: 101, quantity: 2 }],
      couponCode: undefined,
      shippingCityCode: '48',
      shippingMethod: 'STANDARD',
    });
  });

  it('builds a fallback quote when the user is not signed in', async () => {
    const { result } = renderUseCheckoutPricing({
      user: null,
      selectedCityCode: '48',
      subtotal: 600000,
    });

    await waitFor(() => {
      expect(result.current.pricingQuote).toEqual({
        itemsSubtotal: 600000,
        shippingFee: 0,
        discountAmount: 0,
        totalAmount: 600000,
        shippingMethod: 'STANDARD',
        shippingCityCode: '48',
        appliedCouponCode: null,
        coupon: null,
      });
      expect(result.current.standardPreviewFee).toBe(0);
    });

    expect(quoteOrderMock).not.toHaveBeenCalled();
  });

  it('applies a coupon and updates the quote', async () => {
    quoteOrderMock
      .mockResolvedValueOnce(makeQuote({
        appliedCouponCode: null,
        coupon: null,
        discountAmount: 0,
        totalAmount: 600000,
      }))
      .mockResolvedValueOnce(makeQuote());

    const { result } = renderUseCheckoutPricing();

    await waitFor(() => {
      expect(result.current.pricingQuote?.totalAmount).toBe(600000);
    });

    act(() => {
      result.current.setCouponInput('SPRING');
    });

    await act(async () => {
      await result.current.handleApplyCoupon();
    });

    await waitFor(() => {
      expect(result.current.appliedCouponCode).toBe('SPRING');
      expect(result.current.pricingQuote?.discountAmount).toBe(30000);
      expect(result.current.total).toBe(570000);
      expect(result.current.couponInput).toBe('');
      expect(result.current.couponError).toBe('');
    });

    expect(quoteOrderMock).toHaveBeenLastCalledWith({
      items: [{ variantId: 101, quantity: 2 }],
      couponCode: 'SPRING',
      shippingCityCode: '48',
      shippingMethod: 'STANDARD',
    });
  });

  it('shows an error when applying a coupon before selecting a province', async () => {
    const { result } = renderUseCheckoutPricing({
      user: { id: '1' },
      selectedCityCode: '',
      subtotal: 400000,
    });

    await waitFor(() => {
      expect(result.current.pricingQuote?.shippingCityCode).toBeNull();
    });

    act(() => {
      result.current.setCouponInput('SPRING');
    });

    await act(async () => {
      await result.current.handleApplyCoupon();
    });

    expect(result.current.couponError).toBe('shipping.selectProvinceFirst');
    expect(quoteOrderMock).not.toHaveBeenCalled();
  });
});
