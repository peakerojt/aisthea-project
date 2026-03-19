import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export interface CouponData {
    couponId: number;
    code: string;
    type: string; // "FIXED_AMOUNT" | "PERCENTAGE"
    value: number;
    maxDiscountAmount: number | null;
    minOrderValue: number;
    endDate: string;
    status: string;
}

interface CouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartSubtotal: number;
    onApplyCoupon: (code: string) => void;
}

export const CouponModal: React.FC<CouponModalProps> = ({ isOpen, onClose, cartSubtotal, onApplyCoupon }) => {
    const [coupons, setCoupons] = useState<CouponData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useTranslation('errors');

    useEffect(() => {
        if (isOpen) {
            fetchCoupons();
            // Prevent scrolling on body when modal open
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [isOpen]);

    const fetchCoupons = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get<{ coupons: CouponData[] }>('/api/coupons/available');
            setCoupons(res.coupons || []);
        } catch (err: unknown) {
            setError((err as Error).message || t('FETCH_COUPONS_FAILED'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

    const handleApplyText = () => {
        if (inputCode.trim()) {
            onApplyCoupon(inputCode.trim());
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 transition-all duration-200 ease-out lg:p-0 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            role="presentation"
        >
            {/* Click outside to close (Optional but good UX) */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="coupon-modal-title"
                className={`relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
                    isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                }`}
            >

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200/10 bg-white/[0.03] p-4">
                    <h2 id="coupon-modal-title" className="text-lg font-bold uppercase tracking-wide text-white">Kho Voucher</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Input Manual Code */}
                <div className="p-4 border-b border-white/15 bg-bg-dark">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nhập mã giảm giá..."
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            className="flex-1 bg-surface-dark border border-white/15 rounded-sm px-3 py-2 text-sm focus:border-white focus:outline-none transition-colors text-white uppercase placeholder:normal-case"
                        />
                        <button
                            onClick={handleApplyText}
                            disabled={!inputCode.trim()}
                            className="bg-primary text-white px-4 font-bold text-xs rounded-sm hover:bg-red-700 disabled:opacity-50 transition-colors uppercase"
                        >
                            Áp dụng
                        </button>
                    </div>
                </div>

                {/* Body - List */}
                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4 bg-bg-dark">
                    {loading && (
                        <div className="text-center text-gray-400 text-sm py-8 flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                            Đang tải...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="text-center text-red-400 text-sm py-4">
                            {error}
                        </div>
                    )}

                    {!loading && !error && coupons.length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-12 flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">money_off</span>
                            Hiện chưa có mã giảm giá nào phù hợp.
                        </div>
                    )}

                    {!loading && coupons.map(coupon => {
                        const isEligible = cartSubtotal >= coupon.minOrderValue;
                        const progressPercent = Math.min((cartSubtotal / coupon.minOrderValue) * 100, 100);
                        const amountNeeded = coupon.minOrderValue - cartSubtotal;

                        return (
                            <div
                                key={coupon.couponId}
                                className={`flex bg-surface-dark border rounded-sm overflow-hidden transition-all duration-300 relative ${isEligible
                                    ? 'border-primary/40 hover:border-primary shadow-[0_0_15px_rgba(255,0,0,0.05)]'
                                    : 'border-white/15 opacity-60 grayscale-[0.8]'
                                    }`}
                            >
                                {/* Left Decorator (Shopee/Lazada style edge) */}
                                <div className={`w-28 flex flex-col items-center justify-center p-3 shrink-0 border-r border-dashed border-white/15 relative ${isEligible ? 'bg-primary/10 text-primary' : 'bg-white/5 text-gray-400'
                                    }`}>
                                    <span className="material-symbols-outlined text-3xl mb-1">local_offer</span>
                                    <span className="font-bold text-[10px] text-center uppercase tracking-wider block leading-tight">
                                        {coupon.type === 'PERCENTAGE' ? `Giảm ${coupon.value}%` : `Giảm ${formatCurrency(coupon.value)}`}
                                    </span>

                                    {/* Top cutout */}
                                    <div className="w-4 h-4 rounded-full bg-bg-dark absolute -top-2 -right-2 border-b border-l border-white/15 rotate-45"></div>
                                    {/* Bottom cutout */}
                                    <div className="w-4 h-4 rounded-full bg-bg-dark absolute -bottom-2 -right-2 border-t border-l border-white/15 -rotate-45"></div>
                                </div>

                                {/* Right Content */}
                                <div className="flex-1 p-3 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="text-sm font-bold text-white mb-1">
                                                Mã: <span className={isEligible ? 'text-primary' : 'text-gray-300'}>{coupon.code}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mb-[2px]">Đơn tối thiểu {formatCurrency(coupon.minOrderValue)}₫</div>
                                            {coupon.type === 'PERCENTAGE' && coupon.maxDiscountAmount && (
                                                <div className="text-[10px] text-gray-500">Tối đa {formatCurrency(coupon.maxDiscountAmount)}₫</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onApplyCoupon(coupon.code)}
                                            disabled={!isEligible}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider shrink-0 transition-colors ${isEligible
                                                ? 'bg-primary text-white hover:bg-red-700'
                                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            Dùng ngay
                                        </button>
                                    </div>

                                    {/* Progress Bar & Upsell (Only for ineligible) */}
                                    {!isEligible ? (
                                        <div className="mt-3">
                                            <div className="w-full bg-bg-dark h-1.5 rounded-full overflow-hidden mb-1.5">
                                                <div
                                                    className="bg-red-500 h-full origin-left transition-all duration-500 ease-out"
                                                    style={{ width: `${progressPercent}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">info</span>
                                                Mua thêm {formatCurrency(amountNeeded)}₫ để dùng mã này
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                            Đủ điều kiện áp dụng
                                        </div>
                                    )}

                                    {/* Expiry */}
                                    <div className="mt-1 text-[9px] text-gray-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                        HSD: {new Date(coupon.endDate).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CouponModal;
