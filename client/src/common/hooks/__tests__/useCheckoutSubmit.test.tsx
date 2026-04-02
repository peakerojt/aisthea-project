import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const createOrderMock = vi.fn();
const apiPostMock = vi.fn();
const setLatestOrderDataMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/common/api/order.api', () => ({
  orderApi: {
    createOrder: (...args: unknown[]) => createOrderMock(...args),
  },
}));

vi.mock('@/common/utils/api', () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/common/utils/orderSnapshot', () => ({
  setLatestOrderData: (...args: unknown[]) => setLatestOrderDataMock(...args),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { changeLanguage: vi.fn() },
    }),
  };
});

type UseCheckoutSubmitModule = typeof import('@/common/hooks/useCheckoutSubmit');
type UseCheckoutSubmit = UseCheckoutSubmitModule['useCheckoutSubmit'];

const makeCartItem = (overrides?: Record<string, unknown>) => ({
  id: 'cart-1',
  variantId: 101,
  name: 'Basic Tee',
  price: 200000,
  image: '/tee.png',
  color: 'Black',
  size: 'M',
  quantity: 2,
  ref: 'TEE-001',
  ...overrides,
});

const makeQuote = (overrides?: Record<string, unknown>) => ({
  itemsSubtotal: 400000,
  shippingFee: 15000,
  discountAmount: 20000,
  totalAmount: 395000,
  shippingMethod: 'STANDARD',
  shippingCityCode: '01',
  appliedCouponCode: 'SPRING',
  coupon: {
    couponId: 1,
    code: 'SPRING',
    type: 'PERCENT',
    value: 5,
  },
  ...overrides,
});

const makeFormData = (overrides?: Record<string, unknown>) => ({
  email: 'customer@example.com',
  fullName: 'Nguyen Van A',
  phone: '0912345678',
  address: '99 Le Lai',
  city: 'Ha Noi',
  district: 'Ba Dinh',
  ward: 'Dien Bien',
  note: '',
  paymentMethod: 'COD' as const,
  ...overrides,
});

let useCheckoutSubmit: UseCheckoutSubmit;
let getVnpayRedirectUrl: UseCheckoutSubmitModule['getVnpayRedirectUrl'];

describe('useCheckoutSubmit', () => {
  beforeAll(async () => {
    ({ useCheckoutSubmit, getVnpayRedirectUrl } = await import('@/common/hooks/useCheckoutSubmit'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  const renderUseCheckoutSubmit = (overrides?: Partial<Parameters<UseCheckoutSubmit>[0]>) => {
    const setError = vi.fn();
    const setFieldValidationErrors = vi.fn();
    const validateForm = vi.fn().mockReturnValue(makeFormData());
    const fetchQuote = vi.fn().mockResolvedValue(makeQuote());
    const fetchCart = vi.fn().mockResolvedValue(undefined);

    const params: Parameters<UseCheckoutSubmit>[0] = {
      apiFieldToFormField: (field?: string) => {
        const map: Record<string, 'email' | 'fullName' | 'phone' | 'address' | 'city' | 'district' | 'ward' | 'note' | 'items'> = {
          customerEmail: 'email',
          customerName: 'fullName',
          customerPhone: 'phone',
          shippingAddressDetail: 'address',
          shippingCity: 'city',
          shippingDistrict: 'district',
          shippingWard: 'ward',
          note: 'note',
        };

        if (!field) return null;
        if (field.startsWith('items')) return 'items';
        return map[field] ?? null;
      },
      appliedCouponCode: 'SPRING',
      cart: [makeCartItem()],
      fetchCart,
      fetchQuote,
      formData: makeFormData(),
      pricingQuote: makeQuote(),
      selectedCityCode: '01',
      selectedShippingMethod: 'STANDARD',
      setError,
      setFieldValidationErrors,
      user: { id: '1' },
      validateForm,
      ...overrides,
    };

    const hook = renderHook(() => useCheckoutSubmit(params));

    return {
      ...hook,
      fetchCart,
      fetchQuote,
      params,
      setError,
      setFieldValidationErrors,
      validateForm,
    };
  };

  it('extracts the VNPay redirect URL from normalized API responses', () => {
    expect(getVnpayRedirectUrl({
      success: true,
      data: {
        vnpUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=1',
      },
    } as never)).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=1');
  });

  it('creates a COD order, stores snapshot, refreshes cart, and navigates to success page', async () => {
    createOrderMock.mockResolvedValue({
      orderId: 501,
      pricing: {
        itemsTotal: 400000,
        shippingFee: 15000,
        discount: 20000,
        grandTotal: 395000,
        tax: 0,
      },
      paymentMethod: 'COD',
    });

    const { result, fetchCart, validateForm, setError } = renderUseCheckoutSubmit();

    await act(async () => {
      await result.current.handlePlaceOrder({ preventDefault: vi.fn() } as never);
    });

    expect(validateForm).toHaveBeenCalledTimes(1);
    expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: 'COD',
      customerName: 'Nguyen Van A',
      customerEmail: 'customer@example.com',
      customerPhone: '0912345678',
      shippingCity: 'Ha Noi',
      shippingDistrict: 'Ba Dinh',
      shippingWard: 'Dien Bien',
      shippingAddressDetail: '99 Le Lai',
      couponCode: 'SPRING',
      shippingCityCode: '01',
      shippingMethod: 'STANDARD',
      items: [{ variantId: 101, quantity: 2 }],
    }));
    expect(setLatestOrderDataMock).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 501,
      paymentMethod: 'COD',
      shippingFee: 15000,
      discountValue: 20000,
      subtotal: 400000,
      total: 395000,
    }));
    expect(fetchCart).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/order-success');
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('');
  });

  it('blocks checkout when the user is not signed in', async () => {
    const { result, setError } = renderUseCheckoutSubmit({
      user: null,
    });

    await act(async () => {
      await result.current.handlePlaceOrder({ preventDefault: vi.fn() } as never);
    });

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('errors.loginRequired');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(result.current.loading).toBe(false);
  });

  it('requests a VNPay payment URL after order creation', async () => {
    createOrderMock.mockResolvedValue({
      orderId: 888,
      pricing: {
        itemsTotal: 400000,
        shippingFee: 15000,
        discount: 0,
        grandTotal: 415000,
        tax: 0,
      },
      paymentMethod: 'VNPAY',
    });
    apiPostMock.mockResolvedValue({
      success: true,
      data: {
        vnpUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=1',
      },
    });

    const { result, setError } = renderUseCheckoutSubmit({
      formData: makeFormData({ paymentMethod: 'VNPAY' }),
      validateForm: vi.fn().mockReturnValue(makeFormData({ paymentMethod: 'VNPAY' })),
    });

    await act(async () => {
      await result.current.handlePlaceOrder({ preventDefault: vi.fn() } as never);
    });

    expect(apiPostMock).toHaveBeenCalledWith('/api/vnpay/create_payment_url', {
      orderId: 888,
      orderDescription: 'Thanh toan don hang 888',
      orderType: 'other',
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalledWith('errors.vnpayUrlFailed');
  });

  it('maps API validation errors back to checkout fields', async () => {
    createOrderMock.mockRejectedValue({
      message: 'Đơn hàng không hợp lệ',
      details: [
        { field: 'shippingCity', message: 'Vui lòng chọn tỉnh/thành' },
        { field: 'items.0.quantity', message: 'Số lượng không hợp lệ' },
      ],
    });

    const { result, setError, setFieldValidationErrors } = renderUseCheckoutSubmit();

    await act(async () => {
      await result.current.handlePlaceOrder({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() => {
      expect(setFieldValidationErrors).toHaveBeenCalledWith({
        city: 'Vui lòng chọn tỉnh/thành',
        items: 'Số lượng không hợp lệ',
      });
    });
    expect(setError).toHaveBeenLastCalledWith('Đơn hàng không hợp lệ');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
