import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const getProfileMock = vi.fn();
const getAddressesMock = vi.fn();
const fetchVNProvincesMock = vi.fn();
const fetchVNDistrictsMock = vi.fn();
const fetchVNWardsMock = vi.fn();
const resolveVNLocationSelectionMock = vi.fn();

vi.mock('@/store/services/user.service', () => ({
  userService: {
    getProfile: (...args: unknown[]) => getProfileMock(...args),
    getAddresses: (...args: unknown[]) => getAddressesMock(...args),
  },
}));

vi.mock('@/common/utils/vnLocation', () => ({
  fetchVNProvinces: (...args: unknown[]) => fetchVNProvincesMock(...args),
  fetchVNDistricts: (...args: unknown[]) => fetchVNDistrictsMock(...args),
  fetchVNWards: (...args: unknown[]) => fetchVNWardsMock(...args),
  resolveVNLocationSelection: (...args: unknown[]) => resolveVNLocationSelectionMock(...args),
}));

type UseCheckoutForm = typeof import('@/common/hooks/useCheckoutForm').useCheckoutForm;

const makeProfile = (overrides?: Record<string, unknown>) => ({
  userId: 1,
  email: 'customer@example.com',
  fullName: 'Nguyen Van A',
  phone: '0987654321',
  avatarUrl: null,
  googleId: null,
  status: 'ACTIVE',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  completeness: 100,
  ...overrides,
});

const makeAddress = (overrides?: Record<string, unknown>) => ({
  addressId: 1,
  userId: 1,
  recipientName: 'Tran Thi B',
  phone: '0911222333',
  addressLine: '123 Nguyen Trai',
  city: 'Ha Noi',
  district: 'Ba Dinh',
  ward: 'Dien Bien',
  isDefault: false,
  ...overrides,
});

let useCheckoutForm: UseCheckoutForm;

describe('useCheckoutForm', () => {
  beforeAll(async () => {
    ({ useCheckoutForm } = await import('@/common/hooks/useCheckoutForm'));
  });

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchVNProvincesMock.mockResolvedValue([{ code: '01', name: 'Ha Noi' }]);
    fetchVNDistrictsMock.mockResolvedValue([]);
    fetchVNWardsMock.mockResolvedValue([]);
    resolveVNLocationSelectionMock.mockResolvedValue({
      provinceCode: '01',
      districts: [{ code: '001', name: 'Ba Dinh' }],
      districtCode: '001',
      wards: [{ code: '00001', name: 'Dien Bien' }],
      wardCode: '00001',
    });
    getProfileMock.mockResolvedValue(makeProfile());
    getAddressesMock.mockResolvedValue([]);
  });

  it('hydrates profile and default saved address for signed-in users', async () => {
    getProfileMock.mockResolvedValue(makeProfile());
    getAddressesMock.mockResolvedValue([
      makeAddress({ addressId: 10, isDefault: false, recipientName: 'Address One' }),
      makeAddress({
        addressId: 20,
        isDefault: true,
        recipientName: 'Default Recipient',
        phone: '0909000111',
        addressLine: '456 Le Loi',
        district: 'Dong Da',
        ward: 'Cat Linh',
      }),
    ]);

    const { result } = renderHook(() => useCheckoutForm({ user: { id: '1' } }));

    await waitFor(() => {
      expect(result.current.isSavedAddressLoading).toBe(false);
      expect(result.current.savedAddresses).toHaveLength(2);
      expect(result.current.selectedSavedAddressId).toBe('20');
      expect(result.current.formData.email).toBe('customer@example.com');
      expect(result.current.formData.fullName).toBe('Nguyen Van A');
      expect(result.current.formData.phone).toBe('0987654321');
    });
  });

  it('clears shipping fields and related errors when deselecting a saved address', async () => {
    sessionStorage.setItem('checkoutFormData', JSON.stringify({
      email: 'customer@example.com',
      fullName: 'Nguyen Van A',
      phone: '0912345678',
      address: '12 Tran Hung Dao',
      city: 'Ha Noi',
      district: 'Ba Dinh',
      ward: 'Dien Bien',
      note: '',
      paymentMethod: 'COD',
    }));
    sessionStorage.setItem('checkoutSavedAddressId', '10');
    sessionStorage.setItem('checkoutCityCode', '01');
    sessionStorage.setItem('checkoutDistrictCode', '001');
    sessionStorage.setItem('checkoutWardCode', '00001');

    const { result } = renderHook(() => useCheckoutForm({ user: null }));

    act(() => {
      result.current.setFieldValidationErrors({
        address: 'Địa chỉ là bắt buộc',
        city: 'Tỉnh/thành là bắt buộc',
        district: 'Quận/huyện là bắt buộc',
        ward: 'Phường/xã là bắt buộc',
      });
    });

    act(() => {
      result.current.handleSavedAddressChange({ target: { value: '' } } as never);
    });

    expect(result.current.selectedSavedAddressId).toBe('');
    expect(result.current.selectedCityCode).toBe('');
    expect(result.current.selectedDistrictCode).toBe('');
    expect(result.current.selectedWardCode).toBe('');
    expect(result.current.formData.address).toBe('');
    expect(result.current.formData.city).toBe('');
    expect(result.current.formData.district).toBe('');
    expect(result.current.formData.ward).toBe('');
    expect(result.current.getFieldError('address')).toBeUndefined();
    expect(result.current.getFieldError('city')).toBeUndefined();
    expect(result.current.getFieldError('district')).toBeUndefined();
    expect(result.current.getFieldError('ward')).toBeUndefined();
  });

  it('returns normalized data when the checkout form is valid', async () => {
    const { result } = renderHook(() => useCheckoutForm({ user: null }));

    await waitFor(() => {
      expect(fetchVNProvincesMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.handleInputChange({ target: { name: 'email', value: ' TEST@Example.COM ' } } as never);
      result.current.handleInputChange({ target: { name: 'fullName', value: '  Nguyen   Van   A  ' } } as never);
      result.current.handleInputChange({ target: { name: 'phone', value: '+84 912345678' } } as never);
      result.current.handleInputChange({ target: { name: 'address', value: '  99 Le Lai  ' } } as never);
      result.current.handleInputChange({ target: { name: 'city', value: 'Ha Noi' } } as never);
      result.current.handleInputChange({ target: { name: 'district', value: 'Ba Dinh' } } as never);
      result.current.handleInputChange({ target: { name: 'ward', value: 'Dien Bien' } } as never);
      result.current.handleInputChange({ target: { name: 'note', value: '   ' } } as never);
    });

    let parsed: ReturnType<typeof result.current.validateForm>;
    act(() => {
      parsed = result.current.validateForm();
    });

    expect(parsed).toEqual({
      email: 'test@example.com',
      fullName: 'Nguyen Van A',
      phone: '0912345678',
      address: '99 Le Lai',
      city: 'Ha Noi',
      district: 'Ba Dinh',
      ward: 'Dien Bien',
      note: undefined,
      paymentMethod: 'COD',
    });
    expect(result.current.error).toBe('');
    expect(result.current.getFieldError('email')).toBeUndefined();
  });

  it('collects field errors when the checkout form is invalid', () => {
    const { result } = renderHook(() => useCheckoutForm({ user: null }));

    let parsed: ReturnType<typeof result.current.validateForm>;
    act(() => {
      parsed = result.current.validateForm();
    });

    expect(parsed).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.getFieldError('email')).toBeTruthy();
    expect(result.current.getFieldError('fullName')).toBeTruthy();
    expect(result.current.getFieldError('address')).toBeTruthy();
    expect(result.current.apiFieldToFormField('shippingCity')).toBe('city');
    expect(result.current.apiFieldToFormField('items.0.quantity')).toBe('items');
    expect(result.current.apiFieldToFormField('unknownField')).toBeNull();
  });
});
