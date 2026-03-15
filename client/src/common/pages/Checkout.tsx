import React, { useState, useEffect } from 'react';
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

interface CheckoutProps {
    cart?: CartItem[];
}

// THÊM: Interface cho cấu trúc dữ liệu Voucher trả về từ Backend
interface AppliedCoupon {
    coupon: {
        couponId: number;
        code: string;
        type: string;
        value: number;
    };
    discountAmount: number;
    message: string;
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const { items, fetchCart } = useCart();

    // THÊM: Các state quản lý Mã giảm giá (Voucher)
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccessMsg, setCouponSuccessMsg] = useState('');
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

    // Location API states
    const [provinces, setProvinces] = useState<{ code: string, name: string }[]>([]);
    const [districts, setDistricts] = useState<{ code: string, name: string }[]>([]);
    const [wards, setWards] = useState<{ code: string, name: string }[]>([]);

    const [selectedCityCode, setSelectedCityCode] = useState<string>(() => sessionStorage.getItem('checkoutCityCode') || '');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>(() => sessionStorage.getItem('checkoutDistrictCode') || '');
    const [selectedWardCode, setSelectedWardCode] = useState<string>(() => sessionStorage.getItem('checkoutWardCode') || '');

    // THÊM: Shipping method state
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');

    const mappedCart = React.useMemo<CartItem[]>(() => {
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
    }, [items]);

    const cart = propCart ?? mappedCart;

    // Mặc định tự động chọn 'STANDARD' khi user vừa chọn xong Tỉnh/Thành
    useEffect(() => {
        if (selectedCityCode) {
            setSelectedShippingMethod('STANDARD');
        }
    }, [selectedCityCode]);

    // Persist to session storage
    useEffect(() => {
        sessionStorage.setItem('checkoutFormData', JSON.stringify(formData));
        sessionStorage.setItem('checkoutCityCode', selectedCityCode);
        sessionStorage.setItem('checkoutDistrictCode', selectedDistrictCode);
        sessionStorage.setItem('checkoutWardCode', selectedWardCode);
    }, [formData, selectedCityCode, selectedDistrictCode, selectedWardCode]);

    useEffect(() => {
        fetch('https://provinces.open-api.vn/api/p/')
            .then(res => res.json())
            .then(data => setProvinces(data))
            .catch(err => console.error("Failed to fetch provinces:", err));

        if (selectedCityCode) {
            fetch(`https://provinces.open-api.vn/api/p/${selectedCityCode}?depth=2`)
                .then(res => res.json())
                .then(data => setDistricts(data.districts))
                .catch(err => console.error(err));
        }

        if (selectedDistrictCode) {
            fetch(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`)
                .then(res => res.json())
                .then(data => setWards(data.wards))
                .catch(err => console.error(err));
        }
    }, []);

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setSelectedCityCode(code);
        setSelectedDistrictCode('');
        setSelectedWardCode('');

        const province = provinces.find(p => p.code == code);
        setFormData(prev => ({ ...prev, city: province ? province.name : '', district: '', ward: '' }));

        setDistricts([]);
        setWards([]);

        if (code) {
            fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
                .then(res => res.json())
                .then(data => setDistricts(data.districts))
                .catch(err => console.error("Failed to fetch districts:", err));
        }
    };

    const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setSelectedDistrictCode(code);
        setSelectedWardCode('');

        const district = districts.find(d => d.code == code);
        setFormData(prev => ({ ...prev, district: district ? district.name : '', ward: '' }));

        setWards([]);

        if (code) {
            fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
                .then(res => res.json())
                .then(data => setWards(data.wards))
                .catch(err => console.error("Failed to fetch wards:", err));
        }
    };

    const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const code = e.target.value;
        setSelectedWardCode(code);

        const ward = wards.find(w => w.code == code);
        setFormData(prev => ({ ...prev, ward: ward ? ward.name : '' }));
    };

    // Logic tính phí theo Vùng (Zone-Based Shipping)
    const getZone = (cityCode: string) => {
        if (!cityCode) return 0; // Chưa chọn
        if (cityCode === "48") return 1; // Nội thành Đà Nẵng
        if (["46", "49", "51"].includes(cityCode)) return 2; // Lân cận
        return 3; // Toàn quốc
    };

    const getShippingZoneName = (zone: number) => {
        if (zone === 1) return t('shipping.zone.innerCity');
        if (zone === 2) return t('shipping.zone.nearby');
        if (zone === 3) return t('shipping.zone.nationwide');
        return '';
    };

    const calculateShippingFee = (method: 'STANDARD' | 'EXPRESS', zone: number, cartSubtotal: number) => {
        if (zone === 0) return 0;

        let fee = 0;
        if (zone === 1) {
            fee = method === 'STANDARD' ? 15000 : 30000;
        } else if (zone === 2) {
            fee = method === 'STANDARD' ? 25000 : 40000;
        } else if (zone === 3) {
            fee = method === 'STANDARD' ? 40000 : 70000;
        }

        // Đặc quyền Freeship
        if (method === 'STANDARD' && cartSubtotal > 500000) {
            fee = 0;
        }

        return fee;
    };

    // THÊM & CẬP NHẬT: Tính toán tổng tiền có tính cả Voucher & Shipping
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const zone = getZone(selectedCityCode);
    const shippingFee = calculateShippingFee(selectedShippingMethod, zone, subtotal);
    const discountValue = appliedCoupon ? appliedCoupon.discountAmount : 0;
    const total = subtotal + shippingFee - discountValue;
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

    // THÊM: Hàm xử lý gọi API áp dụng mã giảm giá
    const handleApplyCoupon = async (codeToApply?: string) => {
        const codeToUse = typeof codeToApply === 'string' ? codeToApply : couponInput;
        if (!codeToUse.trim()) return;

        setIsApplyingCoupon(true);
        setCouponError('');
        setCouponSuccessMsg('');

        try {
            const response = await api.post<AppliedCoupon>('/api/coupons/validate', {
                code: codeToUse.trim(),
                cartSubtotal: subtotal
            });

            setAppliedCoupon(response);
            setCouponSuccessMsg(response.message);
            setCouponInput('');
        } catch (err: unknown) {
            const error = err as { message?: string; data?: { error?: string } };
            setCouponError(error.message || error.data?.error || t('coupon.invalidCode'));
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    // THÊM: Hàm Gỡ bỏ mã giảm giá
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponError('');
        setCouponSuccessMsg('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

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
        if (!formData.email) return t('validation.emailRequired');
        if (!formData.email.includes('@')) return t('validation.emailFormat');
        if (/\s/.test(formData.email)) return t('validation.emailNoSpaces');
        if (!formData.fullName) return t('validation.fullNameRequired');
        if (formData.fullName.length < 2) return t('validation.fullNameMin');
        if (/[@#$]/.test(formData.fullName)) return t('validation.fullNameNoSpecial');
        if (!formData.phone) return t('validation.phoneRequired');
        if (!/^[0]\d{9}$/.test(formData.phone)) return t('validation.phoneFormat');
        if (!formData.address) return t('validation.addressRequired');
        if (formData.address.length <= 5) return t('validation.addressLength');
        if (!formData.city) return t('validation.cityRequired');
        if (!formData.district) return t('validation.districtRequired');
        if (!formData.ward) return t('validation.wardRequired');
        if (formData.note && formData.note.length > 500) return t('validation.noteMax');
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

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
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

            // CẬP NHẬT: Gửi thêm couponId & shippingMethod, shippingFee xuống Backend
            const data = await api.post<{ orderId: number }>('/api/orders', {
                paymentMethod: formData.paymentMethod,
                customerName: formData.fullName,
                customerPhone: formData.phone,
                shippingCity: formData.city,
                shippingDistrict: formData.district,
                shippingWard: formData.ward,
                shippingAddressDetail: formData.address,
                note: formData.note,
                items: cart.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity
                })),
                couponCode: appliedCoupon ? appliedCoupon.coupon.code : undefined,
                shippingMethod: selectedShippingMethod,
                shippingFee: shippingFee,
            });

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
                shippingFee,
                discountValue,
                subtotal,
                total,
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
                        amount: Math.round(total),
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
            const error = err as { message?: string; data?: { error?: string } };
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
                                        className={inputClassName}
                                    />
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
                                        className={inputClassName}
                                    />
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
                                        className={inputClassName}
                                    />
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
                                        className={inputClassName}
                                    />
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
                                            className={`${selectClassName} cursor-pointer text-white`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectProvince')}</option>
                                            {provinces.map(city => (
                                                <option key={city.code} value={city.code}>{city.name}</option>
                                            ))}
                                        </select>
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
                                            className={`${selectClassName} ${!selectedCityCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'}`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectDistrict')}</option>
                                            {districts.map(dist => (
                                                <option key={dist.code} value={dist.code}>{dist.name}</option>
                                            ))}
                                        </select>
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
                                            className={`${selectClassName} ${!selectedDistrictCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'}`}
                                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                        >
                                            <option value="" disabled>{t('placeholders.selectWard')}</option>
                                            {wards.map(w => (
                                                <option key={w.code} value={w.code}>{w.name}</option>
                                            ))}
                                        </select>
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
                                        className={`${inputClassName} resize-none`}
                                    />
                                    <div id="checkout-note-count" className="mt-1 text-right text-[10px] uppercase tracking-widest text-gray-500">{formData.note.length}/500</div>
                                </div>

                                {/* THÊM: Khu vực Chọn Shipping Method (Radio Cards) */}
                                <fieldset className="mt-6 border-t border-border-dark pt-4">
                                    <legend className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-300">
                                        {t('labels.shippingMethod')}
                                    </legend>

                                    {!selectedCityCode ? (
                                        <div className="rounded-sm border border-dashed border-yellow-500/50 bg-yellow-500/10 p-4" role="status">
                                            <p className="text-yellow-500 text-sm font-medium text-center">{t('shipping.selectProvinceFirst')}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Standard Delivery */}
                                            <label
                                                className={`relative p-4 rounded-sm border cursor-pointer transition-all ${selectedShippingMethod === 'STANDARD'
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/60'
                                                    : 'border-border-dark bg-surface-dark hover:border-gray-500 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value="STANDARD"
                                                    checked={selectedShippingMethod === 'STANDARD'}
                                                    onChange={() => setSelectedShippingMethod('STANDARD')}
                                                    className="sr-only"
                                                />
                                                {selectedShippingMethod === 'STANDARD' && (
                                                    <div className="absolute top-2 right-2 text-primary">
                                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col h-full justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base">{t('shipping.standard.title')}</h4>
                                                        <p className="text-xs text-gray-400 mt-1">{t('shipping.standard.eta')}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dark/50">
                                                        <span className={`text-sm font-bold ${calculateShippingFee('STANDARD', zone, subtotal) === 0 ? 'text-green-500' : 'text-white'}`}>
                                                            {calculateShippingFee('STANDARD', zone, subtotal) === 0
                                                                ? t('shipping.free')
                                                                : formatCurrencyVND(calculateShippingFee('STANDARD', zone, subtotal))}
                                                        </span>
                                                        {subtotal > 500000 && (
                                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{t('shipping.freeShipBadge')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>

                                            {/* Express Delivery */}
                                            <label
                                                className={`relative p-4 rounded-sm border cursor-pointer transition-all ${selectedShippingMethod === 'EXPRESS'
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/60'
                                                    : 'border-border-dark bg-surface-dark hover:border-gray-500 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="shippingMethod"
                                                    value="EXPRESS"
                                                    checked={selectedShippingMethod === 'EXPRESS'}
                                                    onChange={() => setSelectedShippingMethod('EXPRESS')}
                                                    className="sr-only"
                                                />
                                                {selectedShippingMethod === 'EXPRESS' && (
                                                    <div className="absolute top-2 right-2 text-primary">
                                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col h-full justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base">{t('shipping.express.title')}</h4>
                                                        <p className="text-xs text-gray-400 mt-1">{zone === 1 ? t('shipping.express.etaInner') : t('shipping.express.etaOther')}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dark/50">
                                                        <span className="text-sm font-bold text-white">
                                                            {formatCurrencyVND(calculateShippingFee('EXPRESS', zone, subtotal))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
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
                                    <img src="https://vnpay.vn/s1/img/vnpay-logo.svg" alt="VNPAY" className="h-6 brightness-200" />
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
                                            {appliedCoupon.coupon.code}
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
                                    {selectedCityCode && (
                                        <span className="text-[11px] text-gray-500 mt-0.5">{getShippingZoneName(zone)}</span>
                                    )}
                                </div>
                                <span className={`text-right ${shippingFee === 0 && selectedCityCode ? 'text-green-500 font-bold' : 'text-white'}`}>
                                    {!selectedCityCode ? '---' : (shippingFee === 0 ? t('shipping.free') : formatCurrencyVND(shippingFee))}
                                </span>
                            </div>
                            {/* Dòng hiển thị tiền giảm giá nếu có voucher */}
                            {appliedCoupon && (
                                <div className="flex justify-between text-green-400 font-medium animate-fade-in-up">
                                    <span>{t('summary.discount', { code: appliedCoupon.coupon.code })}</span>
                                    <span>-{formatCurrencyVND(appliedCoupon.discountAmount)}</span>
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
                                disabled={loading}
                                className={`flex-1 bg-primary text-white font-bold text-sm uppercase tracking-widest h-12 rounded-sm transition-all shadow-lg flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700 shadow-primary/20'}`}
                            >
                                {loading ? t('actions.processing') : t('actions.placeOrder')}
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

