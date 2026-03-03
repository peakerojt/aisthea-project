import React, { useState, useEffect } from 'react';
import { ViewState, CartItem, CategoryType } from '../types';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../contexts/AuthContext';
import { httpClient } from '../services/httpClient';

interface CheckoutProps {
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    cart: CartItem[];
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

    // Location API states
    const [provinces, setProvinces] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [selectedCityCode, setSelectedCityCode] = useState<string>(() => sessionStorage.getItem('checkoutCityCode') || '');
    const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>(() => sessionStorage.getItem('checkoutDistrictCode') || '');
    const [selectedWardCode, setSelectedWardCode] = useState<string>(() => sessionStorage.getItem('checkoutWardCode') || '');

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

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = subtotal > 200 ? 0 : 15; // Example threshold
    const total = subtotal + shippingFee;

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
        // Email
        if (!formData.email) return 'Vui lòng nhập Email.';
        if (!formData.email.includes('@')) return 'Email phải chứa định dạng @.';
        if (/\s/.test(formData.email)) return 'Email không được chứa khoảng trắng.';

        // Full Name
        if (!formData.fullName) return 'Vui lòng nhập Họ và tên.';
        if (formData.fullName.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        if (/[@#$]/.test(formData.fullName)) return 'Họ và tên không được chứa ký tự đặc biệt như @, #, $.';

        // Phone
        if (!formData.phone) return 'Vui lòng nhập Số điện thoại.';
        if (!/^[0]\d{9}$/.test(formData.phone)) return 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.';

        // Address
        if (!formData.address) return 'Vui lòng nhập Địa chỉ cụ thể.';
        if (formData.address.length <= 5) return 'Địa chỉ phải có độ dài lớn hơn 5 ký tự.';

        // Location DROPDOWNS
        if (!formData.city) return 'Vui lòng chọn Tỉnh thành.';
        if (!formData.district) return 'Vui lòng chọn Quận huyện.';
        if (!formData.ward) return 'Vui lòng chọn Phường xã.';

        // Note
        if (formData.note && formData.note.length > 500) return 'Ghi chú không được vượt quá 500 ký tự.';

        return null; // Valid
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

            const response = await httpClient.post('/api/orders', {
                paymentMethod: formData.paymentMethod,
                customerName: formData.fullName,
                customerPhone: formData.phone,
                shippingCity: formData.city,
                shippingDistrict: formData.district,
                shippingWard: formData.ward,
                shippingAddressDetail: formData.address,
                note: formData.note,
                items: cart
            });

            const data = response.data;

            // Store form data for the success screens
            sessionStorage.setItem('latestOrderData', JSON.stringify(formData));

            // Redirect based on payment method
            if (formData.paymentMethod === 'VNPAY') {
                try {
                    const vnpResponse = await httpClient.post('/api/vnpay/create_payment_url', {
                        amount: Math.round(total),
                        orderId: data.orderId,
                        orderDescription: 'Thanh toan don hang ' + data.orderId,
                        orderType: 'other'
                    });
                    if (vnpResponse.data && vnpResponse.data.vnpUrl) {
                        window.location.href = vnpResponse.data.vnpUrl;
                        return; // Prevent setting loading to false too quickly before redirect
                    }
                } catch (vnpErr) {
                    console.error('Failed to get VNPAY URL:', vnpErr);
                    setError('Không thể tạo link thanh toán VNPAY.');
                }
            } else {
                setView('STORE_ORDER_SUCCESS');
            }

        } catch (err: any) {
            console.error("Order creation error:", err);
            // Handle Axios errors cleanly
            const errorMessage = err.response?.data?.error || err.message || 'Đã xảy ra lỗi khi đặt hàng.';
            setError(errorMessage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-bg-dark text-white font-display overflow-x-hidden min-h-screen">
            {/* Real Store Header injected here */}
            <StoreHeader setView={setView} setCategory={setCategory} transparent={false} />

            {/* Added top padding because header is fixed */}
            <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-28 flex flex-col md:flex-row gap-12 lg:gap-20">

                {/* Left Column: Forms */}
                <div className="w-full md:w-3/5 lg:w-2/3">
                    <form onSubmit={handlePlaceOrder}>

                        {/* Error Message Pushed to the TOP of the Form */}
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
                                    {/* City Dropdown */}
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

                                    {/* District Dropdown */}
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

                                    {/* Ward Dropdown */}
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
                                    <p className="text-sm font-medium whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-border-dark pt-6 mb-6">
                            <div className="flex gap-2">
                                <input type="text" placeholder="Nhập mã giảm giá" className="flex-1 bg-transparent border border-border-dark rounded-sm px-3 text-sm placeholder:text-gray-600 focus:border-white focus:outline-none transition-colors" />
                                <button className="px-4 text-xs font-bold uppercase bg-white/10 hover:bg-white/20 transition-colors rounded-sm text-white">Áp dụng</button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-border-dark text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Tạm tính</span>
                                <span className="text-white">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Phí vận chuyển</span>
                                <span className="text-white">{shippingFee === 0 ? 'Miễn phí' : `$${shippingFee.toFixed(2)}`}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-border-dark">
                            <span className="text-base font-bold uppercase tracking-tighter">Tổng cộng</span>
                            <span className="text-2xl font-black text-primary">${total.toFixed(2)}</span>
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
        </div>
    );
};

export default Checkout;
