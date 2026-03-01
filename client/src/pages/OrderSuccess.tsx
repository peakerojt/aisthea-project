import React from 'react';
import { ViewState, CategoryType } from '../types';
import { Logo } from '../components/Logo';

interface OrderSuccessProps {
    setView: (v: ViewState) => void;
    setCategory?: (c: CategoryType) => void;
}

const OrderSuccess: React.FC<OrderSuccessProps> = ({ setView }) => {
    const [orderData, setOrderData] = React.useState({
        fullName: 'Khách hàng',
        email: 'Không rõ',
        phone: 'Không rõ',
        address: 'Không rõ',
        district: '',
        city: '',
        ward: '',
        paymentMethod: 'COD'
    });

    React.useEffect(() => {
        const orderDataRaw = sessionStorage.getItem('latestOrderData');
        if (orderDataRaw) {
            setOrderData(JSON.parse(orderDataRaw));
        }
    }, [setView]);

    return (
        <div className="min-h-screen bg-bg-dark text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">


            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-green-900/10 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-3xl bg-surface-dark border border-border-dark p-10 lg:p-14 rounded-sm shadow-2xl relative z-10 animate-fade-in-up">

                {/* Header Logo */}
                <div className="flex justify-center mb-10">
                    <Logo className="text-3xl" />
                </div>

                {/* SubHeader Checkmark */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-12 border-b border-border-dark pb-10">
                    <div className="w-20 h-20 rounded-full border-4 border-green-500/30 flex items-center justify-center bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                        <span className="material-symbols-outlined text-green-500 text-5xl">check</span>
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-2">Cám ơn bạn đã đặt hàng!</h2>
                        <p className="text-gray-400 text-sm max-w-md">
                            Một email xác nhận đã được gửi tới địa chỉ của bạn. Xin vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam) để theo dõi.
                        </p>
                    </div>
                </div>

                {/* Info Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-12">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Thông tin mua hàng</h3>
                            <div className="text-sm text-gray-300 space-y-1">
                                <p className="font-medium text-white">{orderData.fullName}</p>
                                <p>{orderData.email}</p>
                                <p>{orderData.phone}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Phương thức thanh toán</h3>
                            <p className="text-sm text-gray-300">{orderData.paymentMethod === 'VNPAY' ? 'Thanh toán qua VNPAY-QR' : 'Thanh toán khi giao hàng (COD)'}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Địa chỉ nhận hàng</h3>
                            <div className="text-sm text-gray-300 space-y-1">
                                <p className="font-medium text-white">{orderData.fullName}</p>
                                <p>{orderData.address}{orderData.ward ? `, ${orderData.ward}` : ''}</p>
                                <p>{orderData.district ? `${orderData.district}, ` : ''}{orderData.city}</p>
                                <p>{orderData.phone}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Phương thức vận chuyển</h3>
                            <p className="text-sm text-gray-300">Giao hàng tận nơi (Tiêu chuẩn)</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                    <button
                        onClick={() => setView('STORE_HOME')}
                        className="w-full sm:w-auto px-10 h-12 bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm"
                    >
                        Tiếp tục mua hàng
                    </button>
                    <button
                        onClick={() => setView('STORE_MY_ORDERS')}
                        className="w-full sm:w-auto px-8 h-12 border border-border-dark text-gray-300 font-bold text-xs uppercase tracking-widest hover:border-white hover:text-white transition-colors rounded-sm"
                    >
                        Xem đơn hàng
                    </button>
                </div>

            </div>
        </div>
    );
}

export default OrderSuccess;
