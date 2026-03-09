import React, { useState, useEffect } from 'react';
import { ViewState, CartItem, CategoryType } from '../types';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { CouponModal } from '../components/CouponModal';

interface CheckoutProps {
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    cart: CartItem[];
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
const Checkout: React.FC<CheckoutProps> = ({ setView, setCategory, cart }) => {
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
        if (zone === 1) return '(Giao nội thành Đà Nẵng)';
        if (zone === 2) return '(Giao lân cận)';
        if (zone === 3) return '(Giao toàn quốc)';
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
            setCouponError(error.message || error.data?.error || 'Mã giảm giá không hợp lệ.');
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
        if (!formData.email) return 'Vui lòng nhập Email.';
        if (!formData.email.includes('@')) return 'Email phải chứa định dạng @.';
        if (/\s/.test(formData.email)) return 'Email không được chứa khoảng trắng.';
        if (!formData.fullName) return 'Vui lòng nhập Họ và tên.';
        if (formData.fullName.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        if (/[@#$]/.test(formData.fullName)) return 'Họ và tên không được chứa ký tự đặc biệt như @, #, $.';
        if (!formData.phone) return 'Vui lòng nhập Số điện thoại.';
        if (!/^[0]\d{9}$/.test(formData.phone)) return 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';
        if (!formData.address) return 'Vui lòng nhập Địa chỉ cụ thể.';
        if (formData.address.length <= 5) return 'Địa chỉ phải có độ dài lớn hơn 5 ký tự.';
        if (!formData.city) return 'Vui lòng chọn Tỉnh thành.';
        if (!formData.district) return 'Vui lòng chọn Quận huyện.';
        if (!formData.ward) return 'Vui lòng chọn Phường xã.';
        if (formData.note && formData.note.length > 500) return 'Ghi chú không được vượt quá 500 ký tự.';
        return null;
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (cart.length === 0) {
            setError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi chuyển tới trang thanh toán.');
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
                setError('Vui lòng đăng nhập để thực hiện đặt hàng.');
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

            sessionStorage.setItem('latestOrderData', JSON.stringify(formData));

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
                    setError('Không thể tạo link thanh toán VNPAY.');
                }
            } else {
                setView('STORE_ORDER_SUCCESS');
            }

        } catch (err: unknown) {
            console.error("Order creation error:", err);
            const error = err as { message?: string; data?: { error?: string } };
            const errorMessage = error.message || error.data?.error || 'Đã xảy ra lỗi khi đặt hàng.';
            setError(errorMessage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-bg-dark text-white font-display overflow-x-hidden min-h-screen">
            <StoreHeader setView={setView} setCategory={setCategory} transparent={false} />

            <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-28 flex flex-col md:flex-row gap-12 lg:gap-20">

                {/* Left Column: Forms */}
                <div className="w-full md:w-3/5 lg:w-2/3">
                    <form onSubmit={handlePlaceOrder}>

                        {error && (
                            <div className="mb-8 p-4 bg-red-900/40 border border-red-500/50 rounded-sm text-red-100 text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-red-400 mt-[2px] text-lg">error</span>
                                <div>
                                    <span className="font-bold block tracking-wide">Please check your information</span>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* 1. Contact Info */}
                        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="mb-6 border-b border-border-dark pb-2">
                                <h2 className="text-xl font-bold uppercase tracking-wide">Thông tin nhận hàng</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="group relative">
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email (Bắt buộc)"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors peer"
                                    />
                                </div>

                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Họ và tên (Bắt buộc)"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                                />
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Số điện thoại (Bắt buộc)"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Shipping Info */}
                        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <h2 className="text-xl font-bold uppercase tracking-wide mb-6 border-b border-border-dark pb-2">Vận chuyển</h2>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Địa chỉ cụ thể (Thôn, xóm, số nhà, ngõ...)"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select
                                        name="city"
                                        value={selectedCityCode}
                                        onChange={handleProvinceChange}
                                        className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors text-white cursor-pointer appearance-none"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                    >
                                        <option value="" disabled>1. Chọn Tỉnh/Thành</option>
                                        {provinces.map(city => (
                                            <option key={city.code} value={city.code}>{city.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        name="district"
                                        value={selectedDistrictCode}
                                        onChange={handleDistrictChange}
                                        disabled={!selectedCityCode}
                                        className={`w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors appearance-none ${!selectedCityCode ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-white cursor-pointer'}`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                    >
                                        <option value="" disabled>2. Chọn Quận/Huyện</option>
                                        {districts.map(dist => (
                                            <option key={dist.code} value={dist.code}>{dist.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        name="ward"
                                        value={selectedWardCode}
                                        onChange={handleWardChange}
                                        disabled={!selectedDistrictCode}
                                        className={`w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors appearance-none ${!selectedDistrictCode ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-white cursor-pointer'}`}
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                                    >
                                        <option value="" disabled>3. Chọn Phường/Xã</option>
                                        {wards.map(w => (
                                            <option key={w.code} value={w.code}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <textarea
                                    name="note"
                                    placeholder="Ghi chú (tùy chọn - Tối đa 500 ký tự)"
                                    rows={3}
                                    maxLength={500}
                                    value={formData.note}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-dark border border-border-dark rounded-sm px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors resize-none"
                                />
                                <div className="text-right text-[10px] text-gray-500 mt-1 uppercase tracking-widest">{formData.note.length}/500</div>

                                {/* THÊM: Khu vực Chọn Shipping Method (Radio Cards) */}
                                <div className="mt-6 pt-4 border-t border-border-dark">
                                    <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-gray-300">Phương thức vận chuyển</h3>

                                    {!selectedCityCode ? (
                                        <div className="p-4 border border-dashed border-yellow-500/50 bg-yellow-500/10 rounded-sm">
                                            <p className="text-yellow-500 text-sm font-medium text-center">Vui lòng chọn Tỉnh/Thành để xem phương thức vận chuyển</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Standard Delivery */}
                                            <div
                                                onClick={() => setSelectedShippingMethod('STANDARD')}
                                                className={`relative p-4 rounded-sm border cursor-pointer transition-all ${selectedShippingMethod === 'STANDARD'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border-dark bg-surface-dark hover:border-gray-500'
                                                    }`}
                                            >
                                                {selectedShippingMethod === 'STANDARD' && (
                                                    <div className="absolute top-2 right-2 text-primary">
                                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col h-full justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base">Giao Tiêu Chuẩn</h4>
                                                        <p className="text-xs text-gray-400 mt-1">Nhận hàng sau 3-4 ngày</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dark/50">
                                                        <span className={`text-sm font-bold ${calculateShippingFee('STANDARD', zone, subtotal) === 0 ? 'text-green-500' : 'text-white'}`}>
                                                            {calculateShippingFee('STANDARD', zone, subtotal) === 0
                                                                ? 'Miễn phí'
                                                                : calculateShippingFee('STANDARD', zone, subtotal).toLocaleString('vi-VN') + ' ₫'}
                                                        </span>
                                                        {subtotal > 500000 && (
                                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Freeship</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Express Delivery */}
                                            <div
                                                onClick={() => setSelectedShippingMethod('EXPRESS')}
                                                className={`relative p-4 rounded-sm border cursor-pointer transition-all ${selectedShippingMethod === 'EXPRESS'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border-dark bg-surface-dark hover:border-gray-500'
                                                    }`}
                                            >
                                                {selectedShippingMethod === 'EXPRESS' && (
                                                    <div className="absolute top-2 right-2 text-primary">
                                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col h-full justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-white text-base">Giao Hoả Tốc</h4>
                                                        <p className="text-xs text-gray-400 mt-1">{zone === 1 ? 'Nhận hàng trong ngày' : 'Nhận hàng sau 1-2 ngày'}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dark/50">
                                                        <span className="text-sm font-bold text-white">
                                                            {calculateShippingFee('EXPRESS', zone, subtotal).toLocaleString('vi-VN')} ₫
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Payment Methods */}
                        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <h2 className="text-xl font-bold uppercase tracking-wide mb-6 border-b border-border-dark pb-2">Thanh toán</h2>

                            <div className="border border-border-dark rounded-sm overflow-hidden bg-surface-dark">
                                {/* VNPAY Option */}
                                <label className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${formData.paymentMethod === 'VNPAY' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="VNPAY"
                                            checked={formData.paymentMethod === 'VNPAY'}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-sm font-medium">Thanh toán qua VNPAY-QR</span>
                                    </div>
                                    <img src="https://vnpay.vn/s1/img/vnpay-logo.svg" alt="VNPAY" className="h-6 brightness-200" />
                                </label>

                                <div className="h-[1px] bg-border-dark w-full"></div>

                                {/* COD Option */}
                                <label className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${formData.paymentMethod === 'COD' ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={formData.paymentMethod === 'COD'}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-sm font-medium">Thanh toán khi giao hàng (COD)</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400">local_shipping</span>
                                </label>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Right Column: Order Summary */}
                <div className="w-full md:w-2/5 lg:w-1/3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="bg-surface-dark border border-border-dark rounded-sm p-6 lg:p-8 sticky top-32 shadow-xl">
                        <h2 className="text-lg font-bold uppercase tracking-wide mb-6 pb-4 border-b border-border-dark">Đơn hàng ({cart.length} sản phẩm)</h2>

                        {/* Item List */}
                        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {cart.map((item, i) => (
                                <div key={i} className="flex gap-4 items-center group relative">
                                    <div className="w-16 h-20 shrink-0 bg-neutral-800 rounded-sm overflow-hidden relative">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        <span className="absolute -top-2 -right-2 bg-gray-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold z-10 border-2 border-surface-dark">{item.quantity}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold truncate text-gray-200">{item.name}</h3>
                                        <p className="text-xs text-gray-500">{item.size} / {item.color}</p>
                                    </div>
                                    <p className="text-sm font-medium whitespace-nowrap">{(item.price * item.quantity).toLocaleString('vi-VN')} ₫</p>
                                </div>
                            ))}
                        </div>

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
                                            Chọn hoặc nhập mã giảm giá
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
                                            Gỡ bỏ
                                        </button>
                                    </div>
                                    {couponSuccessMsg && <p className="text-green-400/80 text-xs mt-1">{couponSuccessMsg}</p>}
                                </div>
                            )}
                        </div>

                        {/* CẬP NHẬT: CHI TIẾT TẠM TÍNH */}
                        <div className="space-y-3 pt-6 border-t border-border-dark text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Tạm tính</span>
                                <span className="text-white">{subtotal.toLocaleString('vi-VN')} ₫</span>
                            </div>
                            <div className="flex justify-between items-start text-gray-400">
                                <div className="flex flex-col">
                                    <span>Phí vận chuyển</span>
                                    {selectedCityCode && (
                                        <span className="text-[11px] text-gray-500 mt-0.5">{getShippingZoneName(zone)}</span>
                                    )}
                                </div>
                                <span className={`text-right ${shippingFee === 0 && selectedCityCode ? 'text-green-500 font-bold' : 'text-white'}`}>
                                    {!selectedCityCode ? '---' : (shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} ₫`)}
                                </span>
                            </div>
                            {/* Dòng hiển thị tiền giảm giá nếu có voucher */}
                            {appliedCoupon && (
                                <div className="flex justify-between text-green-400 font-medium animate-fade-in-up">
                                    <span>Giảm giá ({appliedCoupon.coupon.code})</span>
                                    <span>-{appliedCoupon.discountAmount.toLocaleString('vi-VN')} ₫</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-border-dark">
                            <span className="text-base font-bold uppercase tracking-tighter">Tổng cộng</span>
                            <span className="text-2xl font-black text-primary">{total.toLocaleString('vi-VN')} ₫</span>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                            <button onClick={() => setView('STORE_CART')} className="text-xs font-bold uppercase text-gray-400 hover:text-white flex items-center gap-1 transition-colors w-full sm:w-auto justify-center">
                                <span className="material-symbols-outlined text-[16px]">arrow_back_ios</span> Quay về giỏ hàng
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={loading}
                                className={`flex-1 bg-primary text-white font-bold text-sm uppercase tracking-widest h-12 rounded-sm transition-all shadow-lg flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700 shadow-primary/20'}`}
                            >
                                {loading ? 'Đang xử lý...' : 'ĐẶT HÀNG'}
                            </button>
                        </div>
                    </div>
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