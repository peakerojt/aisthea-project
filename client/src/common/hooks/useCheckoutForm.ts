import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import { checkoutFormSchema, type CheckoutFormInput } from '@/common/validation/schemas';
import { FieldErrorMap, firstFieldError, mapZodFieldErrors } from '@/common/validation/errors';
import {
  fetchVNDistricts,
  fetchVNProvinces,
  fetchVNWards,
  resolveVNLocationSelection,
  type VNLocationOption,
} from '@/common/utils/vnLocation';
import { userService, type Address as SavedAddress, type UserProfile } from '@/store/services/user.service';

export type CheckoutFormValues = CheckoutFormInput;
export type CheckoutFieldName = keyof CheckoutFormValues;
export type CheckoutErrorField = CheckoutFieldName | 'items';
export type CheckoutSessionUser = { id: string } | null;

const CHECKOUT_FORM_STORAGE_KEY = 'checkoutFormData';
const CHECKOUT_SAVED_ADDRESS_STORAGE_KEY = 'checkoutSavedAddressId';
const CHECKOUT_CITY_CODE_STORAGE_KEY = 'checkoutCityCode';
const CHECKOUT_DISTRICT_CODE_STORAGE_KEY = 'checkoutDistrictCode';
const CHECKOUT_WARD_CODE_STORAGE_KEY = 'checkoutWardCode';

const defaultForm: CheckoutFormValues = {
  email: '',
  fullName: '',
  phone: '',
  address: '',
  city: '',
  district: '',
  ward: '',
  note: '',
  paymentMethod: 'COD',
};

type UseCheckoutFormParams = {
  user: CheckoutSessionUser;
};

const shippingFieldNames = new Set<CheckoutFieldName>(['address', 'city', 'district', 'ward']);

const parseStoredCheckoutForm = (): CheckoutFormValues => {
  const saved = sessionStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
  if (!saved) {
    return defaultForm;
  }

  try {
    const parsed = checkoutFormSchema.partial().safeParse(JSON.parse(saved));
    if (!parsed.success) {
      return defaultForm;
    }

    return {
      ...defaultForm,
      ...parsed.data,
      note: parsed.data.note ?? '',
    };
  } catch {
    return defaultForm;
  }
};

const isCheckoutFieldName = (value: string): value is CheckoutFieldName => value in defaultForm;

export const useCheckoutForm = ({ user }: UseCheckoutFormParams) => {
  const [formData, setFormData] = useState<CheckoutFormValues>(parseStoredCheckoutForm);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FieldErrorMap>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>(() => sessionStorage.getItem(CHECKOUT_SAVED_ADDRESS_STORAGE_KEY) || '');
  const [isSavedAddressLoading, setIsSavedAddressLoading] = useState(false);
  const [provinces, setProvinces] = useState<VNLocationOption[]>([]);
  const [districts, setDistricts] = useState<VNLocationOption[]>([]);
  const [wards, setWards] = useState<VNLocationOption[]>([]);
  const [selectedCityCode, setSelectedCityCode] = useState<string>(() => sessionStorage.getItem(CHECKOUT_CITY_CODE_STORAGE_KEY) || '');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>(() => sessionStorage.getItem(CHECKOUT_DISTRICT_CODE_STORAGE_KEY) || '');
  const [selectedWardCode, setSelectedWardCode] = useState<string>(() => sessionStorage.getItem(CHECKOUT_WARD_CODE_STORAGE_KEY) || '');
  const hasUserEditedShippingRef = useRef(
    Boolean(formData.address || formData.city || formData.district || formData.ward),
  );

  const selectedSavedAddress = useMemo(
    () => savedAddresses.find((address) => String(address.addressId) === selectedSavedAddressId) ?? null,
    [savedAddresses, selectedSavedAddressId],
  );

  useEffect(() => {
    sessionStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(formData));
    sessionStorage.setItem(CHECKOUT_CITY_CODE_STORAGE_KEY, selectedCityCode);
    sessionStorage.setItem(CHECKOUT_DISTRICT_CODE_STORAGE_KEY, selectedDistrictCode);
    sessionStorage.setItem(CHECKOUT_WARD_CODE_STORAGE_KEY, selectedWardCode);
  }, [formData, selectedCityCode, selectedDistrictCode, selectedWardCode]);

  useEffect(() => {
    if (selectedSavedAddressId) {
      sessionStorage.setItem(CHECKOUT_SAVED_ADDRESS_STORAGE_KEY, selectedSavedAddressId);
      return;
    }

    sessionStorage.removeItem(CHECKOUT_SAVED_ADDRESS_STORAGE_KEY);
  }, [selectedSavedAddressId]);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setSavedAddresses([]);
      setSelectedSavedAddressId('');
      return;
    }

    const hydrateCheckoutProfile = async () => {
      setIsSavedAddressLoading(true);

      try {
        const [profileData, addressesData]: [UserProfile, SavedAddress[]] = await Promise.all([
          userService.getProfile(),
          userService.getAddresses(),
        ]);

        if (cancelled) return;

        setSavedAddresses(addressesData);
        setFormData((prev) => ({
          ...prev,
          email: profileData.email || prev.email || '',
          fullName: profileData.fullName || prev.fullName || '',
          phone: profileData.phone || prev.phone || '',
        }));

        if (addressesData.length === 0) {
          setSelectedSavedAddressId('');
          return;
        }

        const persistedAddressId = sessionStorage.getItem(CHECKOUT_SAVED_ADDRESS_STORAGE_KEY);
        const persistedAddress = persistedAddressId
          ? addressesData.find((address) => String(address.addressId) === persistedAddressId)
          : null;

        if (persistedAddress) {
          setSelectedSavedAddressId(String(persistedAddress.addressId));
          return;
        }

        if (hasUserEditedShippingRef.current) {
          return;
        }

        const defaultAddress = addressesData.find((address) => address.isDefault) ?? addressesData[0];
        setSelectedSavedAddressId(defaultAddress ? String(defaultAddress.addressId) : '');
      } catch (profileError) {
        if (!cancelled) {
          console.error('[Checkout] Failed to hydrate profile/address data:', profileError);
        }
      } finally {
        if (!cancelled) {
          setIsSavedAddressLoading(false);
        }
      }
    };

    void hydrateCheckoutProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    fetchVNProvinces()
      .then((data) => setProvinces(data))
      .catch((err) => console.error('Failed to fetch provinces:', err));

    if (selectedCityCode) {
      fetchVNDistricts(selectedCityCode)
        .then((data) => setDistricts(data))
        .catch((err) => console.error(err));
    }

    if (selectedDistrictCode) {
      fetchVNWards(selectedDistrictCode)
        .then((data) => setWards(data))
        .catch((err) => console.error(err));
    }
  }, []);

  const syncSavedAddressLocation = useCallback(async (address: SavedAddress) => {
    try {
      const resolved = await resolveVNLocationSelection(address, provinces);
      setSelectedCityCode(resolved.provinceCode);
      setDistricts(resolved.districts);
      setSelectedDistrictCode(resolved.districtCode);
      setWards(resolved.wards);
      setSelectedWardCode(resolved.wardCode);
    } catch (locationError) {
      console.error('[Checkout] Failed to sync saved address locations:', locationError);
    }
  }, [provinces]);

  useEffect(() => {
    if (!selectedSavedAddress) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: selectedSavedAddress.recipientName || prev.fullName,
      phone: selectedSavedAddress.phone || prev.phone,
      address: selectedSavedAddress.addressLine || '',
      city: selectedSavedAddress.city || '',
      district: selectedSavedAddress.district || '',
      ward: selectedSavedAddress.ward || '',
    }));

    void syncSavedAddressLocation(selectedSavedAddress);
  }, [selectedSavedAddress, syncSavedAddressLocation]);

  useEffect(() => {
    if (!selectedSavedAddressId) {
      return;
    }

    const nextSelectedAddress = savedAddresses.find(
      (address) => String(address.addressId) === selectedSavedAddressId,
    );

    if (!nextSelectedAddress) {
      setSelectedSavedAddressId('');
    }
  }, [savedAddresses, selectedSavedAddressId]);

  const apiFieldToFormField = (field?: string): CheckoutErrorField | null => {
    if (!field) return null;

    const directMap: Record<string, CheckoutFieldName> = {
      customerEmail: 'email',
      customerName: 'fullName',
      customerPhone: 'phone',
      shippingAddressDetail: 'address',
      shippingCity: 'city',
      shippingDistrict: 'district',
      shippingWard: 'ward',
      note: 'note',
    };

    if (directMap[field]) {
      return directMap[field];
    }

    if (field.startsWith('items')) {
      return 'items';
    }

    return isCheckoutFieldName(field) ? field : null;
  };

  const setFieldValidationErrors = (errors: FieldErrorMap) => {
    setFormErrors(errors);
    const firstMessage = firstFieldError(errors);
    if (firstMessage) {
      setError(firstMessage);
    }
  };

  const clearFieldError = (field: CheckoutErrorField) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const getFieldError = (field: CheckoutErrorField) => formErrors[field];

  const handleSavedAddressChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextAddressId = e.target.value;
    setSelectedSavedAddressId(nextAddressId);

    if (nextAddressId) {
      return;
    }

    hasUserEditedShippingRef.current = false;
    setError('');
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.address;
      delete next.city;
      delete next.district;
      delete next.ward;
      return next;
    });
    setFormData((prev) => ({
      ...prev,
      address: '',
      city: '',
      district: '',
      ward: '',
    }));
    setSelectedCityCode('');
    setSelectedDistrictCode('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);
  };

  const handleProvinceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    hasUserEditedShippingRef.current = true;
    clearFieldError('city');
    clearFieldError('district');
    clearFieldError('ward');
    setError('');
    setSelectedCityCode(code);
    setSelectedDistrictCode('');
    setSelectedWardCode('');

    const province = provinces.find((item) => item.code == code);
    setFormData((prev) => ({ ...prev, city: province ? province.name : '', district: '', ward: '' }));

    setDistricts([]);
    setWards([]);

    if (code) {
      fetchVNDistricts(code)
        .then((data) => setDistricts(data))
        .catch((err) => console.error('Failed to fetch districts:', err));
    }
  };

  const handleDistrictChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    hasUserEditedShippingRef.current = true;
    clearFieldError('district');
    clearFieldError('ward');
    setError('');
    setSelectedDistrictCode(code);
    setSelectedWardCode('');

    const district = districts.find((item) => item.code == code);
    setFormData((prev) => ({ ...prev, district: district ? district.name : '', ward: '' }));

    setWards([]);

    if (code) {
      fetchVNWards(code)
        .then((data) => setWards(data))
        .catch((err) => console.error('Failed to fetch wards:', err));
    }
  };

  const handleWardChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    hasUserEditedShippingRef.current = true;
    clearFieldError('ward');
    setError('');
    setSelectedWardCode(code);

    const ward = wards.find((item) => item.code == code);
    setFormData((prev) => ({ ...prev, ward: ward ? ward.name : '' }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (!isCheckoutFieldName(name)) {
      return;
    }

    if (shippingFieldNames.has(name)) {
      hasUserEditedShippingRef.current = true;
    }

    clearFieldError(name);
    setError('');

    setFormData((prev) => {
      const newData: CheckoutFormValues = { ...prev, [name]: value };
      if (name === 'city') {
        newData.district = '';
        newData.ward = '';
      } else if (name === 'district') {
        newData.ward = '';
      }
      return newData;
    });
  };

  const validateForm = () => {
    const parsed = checkoutFormSchema.safeParse({
      email: formData.email,
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      district: formData.district,
      ward: formData.ward,
      note: formData.note,
      paymentMethod: formData.paymentMethod,
    });

    if (parsed.success) {
      setFormErrors({});
      return parsed.data;
    }

    const errors = mapZodFieldErrors(parsed.error);
    setFieldValidationErrors(errors);
    return null;
  };

  const formatSavedAddressOption = (address: SavedAddress) =>
    `${address.addressLine}, ${address.ward}, ${address.district}, ${address.city}`;

  return {
    apiFieldToFormField,
    districts,
    error,
    formData,
    formatSavedAddressOption,
    getFieldError,
    handleDistrictChange,
    handleInputChange,
    handleProvinceChange,
    handleSavedAddressChange,
    handleWardChange,
    isSavedAddressLoading,
    provinces,
    savedAddresses,
    selectedCityCode,
    selectedDistrictCode,
    selectedSavedAddress,
    selectedSavedAddressId,
    selectedWardCode,
    setError,
    setFieldValidationErrors,
    validateForm,
    wards,
  };
};
