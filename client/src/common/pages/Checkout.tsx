import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem } from '@/types';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { api } from '@/common/utils/api';
import { CouponModal } from '@/common/components/CouponModal';
import { useCart } from '@/common/contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { CheckoutProgress } from '@/common/components/CheckoutProgress';
import { OrderSummaryRail } from '@/common/components/OrderSummaryRail';
import { CheckoutSectionCard } from '@/common/components/CheckoutSectionCard';
import { formatCurrencyVND } from '@/common/utils/currency';
import { setLatestOrderData } from '@/common/utils/orderSnapshot';
import vnpayLogo from '@/assets/images/vnpay-logo.png';
import { fetchVNDistricts, fetchVNProvinces, fetchVNWards, resolveVNLocationSelection, type VNLocationOption } from '@/common/utils/vnLocation';
import { orderApi } from '@/common/api/order.api';
import { OrderQuote } from '@/common/services/order.service';
import {
    checkoutFormSchema,
    createOrderClientSchema,
    quoteOrderClientSchema,
    validateCouponClientSchema,
} from '@/common/validation/schemas';
import { FieldErrorMap, firstFieldError, mapZodFieldErrors } from '@/common/validation/errors';
import { ZodError } from 'zod';
import { userService, type Address as SavedAddress, type UserProfile } from '@/store/services/user.service';

interface CheckoutProps {
    cart?: CartItem[];
}

// Remote API used for VN Locations (63 Provinces)
const Checkout: React.FC<CheckoutProps> = ({ cart: propCart }) => {
    const { t } = useTranslation('pages', { keyPrefix: 'checkout' });
    const { t: pagesT } = useTranslation('pages');
    const inputClassName = 'w-full rounded-sm border border-border-dark bg-surface-dark px-4 py-3 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-white focus:outline-none';
    const selectClassName = 'w-full appearance-none rounded-sm border border-border-dark bg-surface-dark px-4 py-3 pr-9 text-sm transition-colors focus:border-white focus:outline-none';
    const fieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300';
    const defaultForm = {
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

    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem('checkoutFormData');
        return saved ? JSON.parse(saved) : defaultForm;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formErrors, setFormErrors] = useState<FieldErrorMap>({});
    const { user } = useAuth();
    const navigate = useNavigate();
    const { items, fetchCart } = useCart();

    const [couponInput, setCouponInput] = useState('');
    const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
    const [pricingQuote, setPricingQuote] = useState<OrderQuote | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccessMsg, setCouponSuccessMsg] = useState('');
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>(() => sessionStorage.getItem('checkoutSavedAddressId') || '');
    const [isSavedAddressLoading, setIsSavedAddressLoading] = useState(false);
    const hasUserEditedShippingRef = React.useRef(
        Boolean(formData.address || formData.city || formData.district || formData.ward)
    );

    // Location API states
    const [provinces, setProvinces] = useState<VNLocationOption[]>([]);
    const [districts, setDistricts] = useState<VNLocationOption[]>([]);
    const [wards, setWards] = useState<VNLocationOption[]>([]);

    const [selectedCityCode, setSelectedCityCode] = useState<string>(() => sessionStorage.getItem('checkoutCityCode') || '');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>(() => sessionStorage.getItem('checkoutDistrictCode') || '');
    const [selectedWardCode, setSelectedWardCode] = useState<string>(() => sessionStorage.getItem('checkoutWardCode') || '');

    const selectedShippingMethod: 'STANDARD' = 'STANDARD';
    const fieldErrorClassName = 'mt-1 text-xs text-red-400';
    const selectedSavedAddress = useMemo(
        () => savedAddresses.find((address) => String(address.addressId) === selectedSavedAddressId) ?? null,
        [savedAddresses, selectedSavedAddressId]
    );
    const formatSavedAddressOption = (address: SavedAddress) =>
        `${address.addressLine}, ${address.ward}, ${address.district}, ${address.city}`;

    const apiFieldToFormField = (field?: string): string | null => {
        if (!field) return null;

        const directMap: Record<string, string> = {
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

        return field;
    };

    const setFieldValidationErrors = (errors: FieldErrorMap) => {
        setFormErrors(errors);
        const firstMessage = firstFieldError(errors);
        if (firstMessage) {
            setError(firstMessage);
        }
    };

    const clearFieldError = (field: string) => {
        setFormErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const getFieldError = (field: string) => formErrors[field];

    const mappedCart = useMemo<CartItem[]>(() => {
        const source = items as any[];
        return source.map(item => {
            const variant = item.variant;
            const id = (item.cartItemId ?? item.variantId ?? item.id ?? Math.random()).toString();
            const price = Number(item.price ?? variant?.price ?? 0);
            const image = item.image
                || item.imageUrl
                || variant?.product?.images?.[0]?.thumbnailUrl
                || variant?.product?.images?.[0]?.imageUrl
                || '';
            const name = item.name || item.productName || variant?.product?.name || t('fallback.productName');
            const ref = item.ref || variant?.sku || variant?.product?.slug || '';
            const color = item.color || item.variantName || '';
            const size = item.size || item.variantName || variant?.sku || '';
            const quantity = item.quantity ?? 1;
            return {
                cartItemId: item.cartItemId,
                id,
                productId: item.productId?.toString?.() ?? variant?.product?.productId?.toString?.(),
                variantId: variant?.variantId ?? item.variantId,
                name,
                price,
                image,
                color,
                size,
                quantity,
                ref,
            } as CartItem;
        });
    }, [items, t]);

    const cart = propCart ?? mappedCart;
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const appliedCoupon = pricingQuote?.coupon ?? null;

    // Persist to session storage
    useEffect(() => {
        sessionStorage.setItem('checkoutFormData', JSON.stringify(formData));
        sessionStorage.setItem('checkoutCityCode', selectedCityCode);
        sessionStorage.setItem('checkoutDistrictCode', selectedDistrictCode);
        sessionStorage.setItem('checkoutWardCode', selectedWardCode);
    }, [formData, selectedCityCode, selectedDistrictCode, selectedWardCode]);

    useEffect(() => {
        if (selectedSavedAddressId) {
            sessionStorage.setItem('checkoutSavedAddressId', selectedSavedAddressId);
            return;
        }

        sessionStorage.removeItem('checkoutSavedAddressId');
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
                setFormData(prev => ({
                    ...prev,
                    email: profileData.email || prev.email || '',
                    fullName: profileData.fullName || prev.fullName || '',
                    phone: profileData.phone || prev.phone || '',
                }));

                if (addressesData.length === 0) {
                    setSelectedSavedAddressId('');
                    return;
                }

                const persistedAddressId = sessionStorage.getItem('checkoutSavedAddressId');
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
            .then(data => setProvinces(data))
            .catch(err => console.error("Failed to fetch provinces:", err));

        if (selectedCityCode) {
            fetchVNDistricts(selectedCityCode)
                .then(data => setDistricts(data))
                .catch(err => console.error(err));
        }

        if (selectedDistrictCode) {
            fetchVNWards(selectedDistrictCode)
                .then(data => setWards(data))
                .catch(err => console.error(err));
        }
    }, []);

    const syncSavedAddressLocation = React.useCallback(async (address: SavedAddress) => {
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

        setFormData(prev => ({
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
            (address) => String(address.addressId) === selectedSavedAddressId
        );

        if (!nextSelectedAddress) {
            setSelectedSavedAddressId('');
        }
    }, [savedAddresses, selectedSavedAddressId]);

    const handleSavedAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextAddressId = e.target.value;
        setSelectedSavedAddressId(nextAddressId);

        if (nextAddressId) {
            return;
        }

        hasUserEditedShippingRef.current = false;
        setError('');
        setFormErrors(prev => {
            const next = { ...prev };
            delete next.address;
            delete next.city;
            delete next.district;
            delete next.ward;
            return next;
        });
        setFormData(prev => ({
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

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        hasUserEditedShippingRef.current = true;
        clearFieldError('city');
        clearFieldError('district');
        clearFieldError('ward');
        setError('');
        setSelectedCityCode(code);
        setSelectedDistrictCode('');
        setSelectedWardCode('');

        const province = provinces.find(p => p.code == code);
        setFormData(prev => ({ ...prev, city: province ? province.name : '', district: '', ward: '' }));

        setDistricts([]);
        setWards([]);

        if (code) {
            fetchVNDistricts(code)
                .then(data => setDistricts(data))
                .catch(err => console.error("Failed to fetch districts:", err));
        }
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        hasUserEditedShippingRef.current = true;
        clearFieldError('district');
        clearFieldError('ward');
        setError('');
        setSelectedDistrictCode(code);
        setSelectedWardCode('');

        const district = districts.find(d => d.code == code);
        setFormData(prev => ({ ...prev, district: district ? district.name : '', ward: '' }));

        setWards([]);

        if (code) {
            fetchVNWards(code)
                .then(data => setWards(data))
                .catch(err => console.error("Failed to fetch wards:", err));
        }
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        hasUserEditedShippingRef.current = true;
        clearFieldError('ward');
        setError('');
        setSelectedWardCode(code);

        const ward = wards.find(w => w.code == code);
        setFormData(prev => ({ ...prev, ward: ward ? ward.name : '' }));
    };

    const getZone = (cityCode: string) => {
        if (!cityCode) return 0; // Chưa chọn
        if (cityCode === "48") return 1; // Nội thành Đà Nẵng
        if (["46", "49", "51"].includes(cityCode)) return 2; // Lân cận
        return 3; // Toàn quốc
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

    const zone = getZone(selectedCityCode);
    const shippingFee = pricingQuote?.shippingFee ?? 0;
    const discountValue = pricingQuote?.discountAmount ?? 0;
    const total = pricingQuote?.totalAmount ?? subtotal;
    const standardPreviewFee = pricingQuote
        ? pricingQuote.shippingFee
        : getShippingPreviewFee('STANDARD', zone, subtotal);
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

    const fetchQuote = React.useCallback(async (couponCodeOverride?: string | null) => {
        if (!user || cart.length === 0) {
            return null;
        }

        const payload = quoteOrderClientSchema.parse({
            items: cart.map(item => ({
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
            setPricingQuote({
                itemsSubtotal: subtotal,
                shippingFee: 0,
                discountAmount: 0,
                totalAmount: subtotal,
                shippingMethod: selectedShippingMethod,
                shippingCityCode: selectedCityCode || null,
                appliedCouponCode: null,
                coupon: null,
            });
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
                            setPricingQuote({
                                itemsSubtotal: subtotal,
                                shippingFee: 0,
                                discountAmount: 0,
                                totalAmount: subtotal,
                                shippingMethod: selectedShippingMethod,
                                shippingCityCode: selectedCityCode || null,
                                appliedCouponCode: null,
                                coupon: null,
                            });
                        }
                    }
                } else {
                    setCouponError('');
                    setPricingQuote({
                        itemsSubtotal: subtotal,
                        shippingFee: 0,
                        discountAmount: 0,
                        totalAmount: subtotal,
                        shippingMethod: selectedShippingMethod,
                        shippingCityCode: selectedCityCode || null,
                        appliedCouponCode: null,
                        coupon: null,
                    });
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'address' || name === 'city' || name === 'district' || name === 'ward') {
            hasUserEditedShippingRef.current = true;
        }
        clearFieldError(name);
        setError('');

        setFormData(prev => {
            const newData = { ...prev, [name]: value };
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

    const handlePlaceOrder = async (e: React.FormEvent) => {
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
                items: cart.map(item => ({
                    variantId: Number(item.variantId),
                    quantity: item.quantity
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
                    const vnpResponse = await api.post<{ vnpUrl: string }>('/api/vnpay/create_payment_url', {
                        orderId: data.orderId,
                        orderDescription: 'Thanh toan don hang ' + data.orderId,
                        orderType: 'other'
                    });
                    if (vnpResponse && vnpResponse.vnpUrl) {
                        window.location.href = vnpResponse.vnpUrl;
                        return;
                    }
                } catch (vnpErr) {
                    console.error('Failed to get VNPAY URL:', vnpErr);
                    setError(t('errors.vnpayUrlFailed'));
                }
            } else {
                navigate('/order-success');
            }

        } catch (err: unknown) {
            console.error("Order creation error:", err);
            const error = err as { message?: string; data?: { error?: string }; details?: Array<{ field?: string; message?: string }> };

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

    return (
        <div className="bg-bg-dark text-white font-display overflow-x-hidden min-h-screen">
            <Header transparent={false} />

            <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-28 flex flex-col md:flex-row gap-12 lg:gap-20">

                {/* Left Column: Forms */}
                <div className="w-full md:w-3/5 lg:w-2/3">
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
                        <CheckoutProgress currentStep="checkout" steps={progressSteps} />
                    </div>

                    <form onSubmit={handlePlaceOrder} noValidate>

                        {error && (
                            <div role="alert" className="mb-8 flex items-start gap-2 rounded-sm border border-red-500/50 bg-red-900/40 p-4 text-sm text-red-100">
                                <span className="material-symbols-outlined text-red-400 mt-[2px] text-lg">error</span>
                                <div>
                                    <span className="font-bold block tracking-wide">{t('errors.checkInfo')}</span>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* 1. Contact Info */}
                        <CheckoutSectionCard
                            title={t('sections.contactInfo')}
                            description={t('descriptions.contactInfo')}
                            style={{ animationDelay: '0.1s' }}
                        >
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="checkout-email" className={fieldLabelClassName}>{t('labels.email')}</label>
                                    <input
                                        id="checkout-email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        placeholder={t('placeholders.emailRequired')}
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`${inputClassName} ${getFieldError('email') ? 'border-red-500 focus:border-red-400' : ''}`}
                                    />
                                    {getFieldError('email') && <p className={fieldErrorClassName}>{getFieldError('email')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="checkout-full-name" className={fieldLabelClassName}>{t('labels.fullName')}</label>
                                    <input
                                        id="checkout-full-name"
                                        type="text"
                                        name="fullName"
                                        required
                                        autoComplete="name"
                                        placeholder={t('placeholders.fullNameRequired')}
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className={`${inputClassName} ${getFieldError('fullName') ? 'border-red-500 focus:border-red-400' : ''}`}
                                    />
                                    {getFieldError('fullName') && <p className={fieldErrorClassName}>{getFieldError('fullName')}</p>}
                                </div>

                                <div>
                                    <label htmlFor="checkout-phone" className={fieldLabelClassName}>{t('labels.phone')}</label>
                                    <input
                                        id="checkout-phone"
                                        type="tel"
                                        name="phone"
                                        required
                                        autoComplete="tel"
                                        inputMode="tel"
                                        placeholder={t('placeholders.phoneRequired')}
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className={`${inputClassName} ${getFieldError('phone') ? 'border-red-500 focus:border-red-400' : ''}`}
                                    />
                                    {getFieldError('phone') && <p className={fieldErrorClassName}>{getFieldError('phone')}</p>}
                                </div>
                            </div>
                        </CheckoutSectionCard>

                        {/* 2. Shipping Info */}
                        <CheckoutSectionCard
                            title={t('sections.shipping')}
                            description={t('descriptions.shipping')}
                            style={{ animationDelay: '0.2s' }}
                        >
                            <div className="space-y-4">
                                {savedAddresses.length > 0 && (
                                    <div>
                                        <label htmlFor="checkout-saved-address" className={fieldLabelClassName}>
                                            {t('labels.savedAddress')}
                                        </label>
                                        <select
                                            id="checkout-saved-address"
                                            value={selectedSavedAddressId}
                                            onChange={handleSavedAddressChange}
                                            className={`${selectClassName} cursor-pointer text-white`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="">{t('placeholders.manualAddressEntry')}</option>
                                            {savedAddresses.map((addressOption) => (
                                                <option key={addressOption.addressId} value={String(addressOption.addressId)}>
                                                    {`${formatSavedAddressOption(addressOption)}${addressOption.isDefault ? ` • ${t('savedAddress.defaultBadge')}` : ''}`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs text-gray-400">
                                            {isSavedAddressLoading ? t('savedAddress.loading') : t('savedAddress.hint')}
                                        </p>
                                        {selectedSavedAddress && (
                                            <p className="mt-2 text-xs text-white/60">
                                                {formatSavedAddressOption(selectedSavedAddress)}
                                                {selectedSavedAddress.isDefault ? ` • ${t('savedAddress.defaultDescription')}` : ''}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="checkout-address" className={fieldLabelClassName}>{t('labels.address')}</label>
                                    <input
                                        id="checkout-address"
                                        type="text"
                                        name="address"
                                        required
                                        autoComplete="street-address"
                                        placeholder={t('placeholders.addressRequired')}
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className={`${inputClassName} ${getFieldError('address') ? 'border-red-500 focus:border-red-400' : ''}`}
                                    />
                                    {getFieldError('address') && <p className={fieldErrorClassName}>{getFieldError('address')}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="checkout-city" className={fieldLabelClassName}>{t('labels.city')}</label>
                                        <select
                                            id="checkout-city"
                                            name="city"
                                            required
                                            value={selectedCityCode}
                                            onChange={handleProvinceChange}
                                            className={`${selectClassName} cursor-pointer text-white ${getFieldError('city') ? 'border-red-500 focus:border-red-400' : ''}`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectProvince')}</option>
                                            {provinces.map(city => (
                                                <option key={city.code} value={city.code}>{city.name}</option>
                                            ))}
                                        </select>
                                        {getFieldError('city') && <p className={fieldErrorClassName}>{getFieldError('city')}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="checkout-district" className={fieldLabelClassName}>{t('labels.district')}</label>
                                        <select
                                            id="checkout-district"
                                            name="district"
                                            required
                                            value={selectedDistrictCode}
                                            onChange={handleDistrictChange}
                                            disabled={!selectedCityCode}
                                            className={`${selectClassName} ${!selectedCityCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'} ${getFieldError('district') ? 'border-red-500 focus:border-red-400' : ''}`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectDistrict')}</option>
                                            {districts.map(dist => (
                                                <option key={dist.code} value={dist.code}>{dist.name}</option>
                                            ))}
                                        </select>
                                        {getFieldError('district') && <p className={fieldErrorClassName}>{getFieldError('district')}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="checkout-ward" className={fieldLabelClassName}>{t('labels.ward')}</label>
                                        <select
                                            id="checkout-ward"
                                            name="ward"
                                            required
                                            value={selectedWardCode}
                                            onChange={handleWardChange}
                                            disabled={!selectedDistrictCode}
                                            className={`${selectClassName} ${!selectedDistrictCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'} ${getFieldError('ward') ? 'border-red-500 focus:border-red-400' : ''}`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectWard')}</option>
                                            {wards.map(w => (
                                                <option key={w.code} value={w.code}>{w.name}</option>
                                            ))}
                                        </select>
                                        {getFieldError('ward') && <p className={fieldErrorClassName}>{getFieldError('ward')}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="checkout-note" className={fieldLabelClassName}>{t('labels.note')}</label>
                                    <textarea
                                        id="checkout-note"
                                        name="note"
                                        placeholder={t('placeholders.noteOptional')}
                                        rows={3}
                                        maxLength={500}
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        aria-describedby="checkout-note-count"
                                        className={`${inputClassName} resize-none ${getFieldError('note') ? 'border-red-500 focus:border-red-400' : ''}`}
                                    />
                                    {getFieldError('note') && <p className={fieldErrorClassName}>{getFieldError('note')}</p>}
                                    <div id="checkout-note-count" className="mt-1 text-right text-[10px] uppercase tracking-widest text-gray-500">{formData.note.length}/500</div>
                                </div>

                                <fieldset className="mt-6 border-t border-border-dark pt-4">
                                    <legend className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-300">
                                        {t('labels.shippingMethod')}
                                    </legend>

                                    {!selectedCityCode ? (
                                        <div className="rounded-sm border border-dashed border-yellow-500/50 bg-yellow-500/10 p-4" role="status">
                                            <p className="text-yellow-500 text-sm font-medium text-center">{t('shipping.selectProvinceFirst')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="rounded-sm border border-primary bg-primary/[0.08] px-4 py-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="text-base font-bold text-white">{t('shipping.standard.title')}</h4>
                                                        <p className="mt-1 text-sm text-gray-300">{t('shipping.standard.eta')}</p>
                                                        <p className="mt-3 text-xs text-gray-400">{t('shipping.freeShipPolicy')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-base font-black ${standardPreviewFee === 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                            {standardPreviewFee === 0 ? t('shipping.free') : formatCurrencyVND(standardPreviewFee)}
                                                        </p>
                                                        {subtotal > 500000 && (
                                                            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                                                                {t('shipping.freeShipBadge')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </fieldset>
                            </div>
                        </CheckoutSectionCard>

                        {/* 3. Payment Methods */}
                        <CheckoutSectionCard
                            title={t('sections.payment')}
                            description={t('descriptions.payment')}
                            style={{ animationDelay: '0.3s' }}
                        >
                            <fieldset className="overflow-hidden rounded-sm border border-border-dark bg-surface-dark">
                                <legend className="sr-only">{t('labels.paymentMethod')}</legend>
                                {/* VNPAY Option */}
                                <label className={`flex items-center justify-between p-4 cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/60 ${formData.paymentMethod === 'VNPAY' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="checkout-payment-vnpay"
                                            type="radio"
                                            name="paymentMethod"
                                            value="VNPAY"
                                            checked={formData.paymentMethod === 'VNPAY'}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-sm font-medium">{t('payment.vnpay')}</span>
                                    </div>
                                    <img src={vnpayLogo} alt="VNPAY" className="h-6 w-auto object-contain" />
                                </label>

                                <div className="h-[1px] bg-border-dark w-full"></div>

                                {/* COD Option */}
                                <label className={`flex items-center justify-between p-4 cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/60 ${formData.paymentMethod === 'COD' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="checkout-payment-cod"
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={formData.paymentMethod === 'COD'}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-sm font-medium">{t('payment.cod')}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400">local_shipping</span>
                                </label>
                            </fieldset>
                        </CheckoutSectionCard>

                    </form>
                </div>

                {/* Right Column: Order Summary */}
                <div className="w-full md:w-2/5 lg:w-1/3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <OrderSummaryRail
                        className="sticky top-32"
                        title={t('summary.title', { count: cart.length })}
                        items={cart}
                        maxHeightClassName="max-h-[300px]"
                    >
                        {/* THÊM: KHU VỰC NHẬP VÀ HIỂN THỊ MÃ GIẢM GIÁ */}
                        <div className="border-t border-border-dark pt-6 mb-6">
                            {!appliedCoupon ? (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCouponModalOpen(true)}
                                        className="w-full flex items-center justify-between bg-surface-dark border border-primary/50 text-primary px-4 py-3 rounded-sm hover:bg-primary/10 transition-colors group shadow-[0_0_10px_rgba(255,0,0,0.1)]"
                                    >
                                        <span className="flex items-center gap-2 font-bold text-sm">
                                            <span className="material-symbols-outlined text-xl">local_activity</span>
                                            {t('coupon.chooseOrEnter')}
                                        </span>
                                        <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                                    </button>
                                    {couponError && <p className="text-red-400 text-xs mt-2 animate-fade-in-up">{couponError}</p>}
                                </div>
                            ) : (
                                <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-sm animate-fade-in-up">
                                    <div className="flex items-center justify-between">
                                        <span className="text-green-400 text-sm font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">local_offer</span>
                                            {appliedCoupon.code}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="text-gray-400 hover:text-red-400 text-xs font-bold uppercase transition-colors"
                                        >
                                            {t('coupon.remove')}
                                        </button>
                                    </div>
                                    {couponSuccessMsg && <p className="text-green-400/80 text-xs mt-1">{couponSuccessMsg}</p>}
                                </div>
                            )}
                        </div>

                        {/* CẬP NHẬT: CHI TIẾT TẠM TÍNH */}
                        <div className="space-y-3 pt-6 border-t border-border-dark text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>{t('summary.subtotal')}</span>
                                <span className="text-white">{formatCurrencyVND(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-start text-gray-400">
                                <div className="flex flex-col">
                                    <span>{t('summary.shippingFee')}</span>
                                </div>
                                <span className={`text-right ${shippingFee === 0 && selectedCityCode ? 'text-green-500 font-bold' : 'text-white'}`}>
                                    {!selectedCityCode ? '---' : (shippingFee === 0 ? t('shipping.free') : formatCurrencyVND(shippingFee))}
                                </span>
                            </div>
                            {/* Dòng hiển thị tiền giảm giá nếu có voucher */}
                            {appliedCoupon && (
                                <div className="flex justify-between text-green-400 font-medium animate-fade-in-up">
                                    <span>{t('summary.discount', { code: appliedCoupon.code })}</span>
                                    <span>-{formatCurrencyVND(discountValue)}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-border-dark">
                            <span className="text-base font-bold uppercase tracking-tighter">{t('summary.total')}</span>
                            <span className="text-2xl font-black text-primary">{formatCurrencyVND(total)}</span>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                            <button onClick={() => navigate('/cart')} className="text-xs font-bold uppercase text-gray-400 hover:text-white flex items-center gap-1 transition-colors w-full sm:w-auto justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_back_ios</span> {t('actions.backToCart')}
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={loading || (Boolean(selectedCityCode) && isQuoteLoading)}
                                className={`flex-1 bg-primary text-white font-bold text-sm uppercase tracking-widest h-12 rounded-sm transition-all shadow-lg flex items-center justify-center gap-2 ${loading || (Boolean(selectedCityCode) && isQuoteLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700 shadow-primary/20'}`}
                            >
                                {loading || (Boolean(selectedCityCode) && isQuoteLoading) ? t('actions.processing') : t('actions.placeOrder')}
                            </button>
                        </div>
                    </OrderSummaryRail>
                </div>
            </main>

            {/* THÊM: Coupon Modal component */}
            <CouponModal
                isOpen={isCouponModalOpen}
                onClose={() => setIsCouponModalOpen(false)}
                cartSubtotal={subtotal}
                onApplyCoupon={(code) => {
                    setIsCouponModalOpen(false);
                    handleApplyCoupon(code);
                }}
            />
        </div>
    );
};

export default Checkout;

