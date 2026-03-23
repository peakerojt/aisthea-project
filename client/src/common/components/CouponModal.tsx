import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';

export interface CouponData {
    couponId: number;
    code: string;
    type: string;
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
        if (!isOpen || typeof document === 'undefined') return undefined;

        void fetchCoupons();

        const { body, documentElement } = document;
        const previousBodyOverflow = body.style.overflow;
        const previousDocumentOverflow = documentElement.style.overflow;

        body.style.overflow = 'hidden';
        documentElement.style.overflow = 'hidden';

        return () => {
            body.style.overflow = previousBodyOverflow;
            documentElement.style.overflow = previousDocumentOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

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

    const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

    const handleApplyText = () => {
        if (inputCode.trim()) {
            onApplyCoupon(inputCode.trim());
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div
                aria-hidden="true"
                className={`fixed inset-0 z-40 bg-slate-950/70 transition-all duration-200 ease-out ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 overflow-hidden p-3 md:p-4" role="presentation">
                <div className="flex h-full items-center justify-center">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="coupon-modal-title"
                        className={`flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform md:max-h-[calc(100vh-2rem)] ${
                            isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                        }`}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200/10 px-6 py-5">
                            <h2 id="coupon-modal-title" className="text-sm font-bold uppercase tracking-wide text-white">
                                Kho Voucher
                            </h2>
                            <button
                                onClick={onClose}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="border-b border-gray-200/10 bg-white/[0.02] px-5 py-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nhập mã giảm giá..."
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    className="flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white uppercase placeholder:normal-case transition-colors focus:border-white/40 focus:outline-none"
                                />
                                <button
                                    onClick={handleApplyText}
                                    disabled={!inputCode.trim()}
                                    className="rounded-lg bg-primary px-4 text-xs font-bold uppercase text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>

                        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#0E1015] px-5 py-4">
                            {loading && (
                                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                                    Đang tải...
                                </div>
                            )}

                            {!loading && error && <div className="py-4 text-center text-sm text-red-400">{error}</div>}

                            {!loading && !error && coupons.length === 0 && (
                                <div className="flex flex-col items-center py-12 text-center text-sm text-gray-500">
                                    <span className="material-symbols-outlined mb-2 text-4xl opacity-50">money_off</span>
                                    Hiện chưa có mã giảm giá nào phù hợp.
                                </div>
                            )}

                            {!loading && coupons.map((coupon) => {
                                const isEligible = cartSubtotal >= coupon.minOrderValue;
                                const progressPercent = Math.min((cartSubtotal / coupon.minOrderValue) * 100, 100);
                                const amountNeeded = coupon.minOrderValue - cartSubtotal;

                                return (
                                    <div
                                        key={coupon.couponId}
                                        className={`relative flex overflow-hidden rounded-xl border transition-all duration-300 ${
                                            isEligible
                                                ? 'border-primary/35 bg-white/[0.03] shadow-[0_0_20px_rgba(255,0,0,0.08)] hover:border-primary/60'
                                                : 'border-white/10 bg-white/[0.02] opacity-70 grayscale-[0.5]'
                                        }`}
                                    >
                                        <div
                                            className={`relative flex w-28 shrink-0 flex-col items-center justify-center border-r border-dashed border-white/12 p-3 ${
                                                isEligible ? 'bg-primary/10 text-primary' : 'bg-white/5 text-gray-400'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined mb-1 text-3xl">local_offer</span>
                                            <span className="block text-center text-[10px] font-bold uppercase leading-tight tracking-wider">
                                                {coupon.type === 'PERCENTAGE' ? `Giảm ${coupon.value}%` : `Giảm ${formatCurrency(coupon.value)}`}
                                            </span>
                                            <div className="absolute -right-2 -top-2 h-4 w-4 rotate-45 rounded-full border-b border-l border-white/15 bg-bg-dark"></div>
                                            <div className="absolute -bottom-2 -right-2 h-4 w-4 -rotate-45 rounded-full border-l border-t border-white/15 bg-bg-dark"></div>
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="mb-1 text-sm font-bold text-white">
                                                        Mã: <span className={isEligible ? 'text-primary' : 'text-gray-300'}>{coupon.code}</span>
                                                    </div>
                                                    <div className="mb-[2px] text-xs text-gray-400">
                                                        Đơn tối thiểu {formatCurrency(coupon.minOrderValue)}₫
                                                    </div>
                                                    {coupon.type === 'PERCENTAGE' && coupon.maxDiscountAmount && (
                                                        <div className="text-[10px] text-gray-500">
                                                            Tối đa {formatCurrency(coupon.maxDiscountAmount)}₫
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => onApplyCoupon(coupon.code)}
                                                    disabled={!isEligible}
                                                    className={`shrink-0 rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                                                        isEligible
                                                            ? 'bg-primary text-white hover:bg-red-700'
                                                            : 'cursor-not-allowed bg-white/10 text-gray-500'
                                                    }`}
                                                >
                                                    Dùng ngay
                                                </button>
                                            </div>

                                            {!isEligible ? (
                                                <div className="mt-3">
                                                    <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-dark">
                                                        <div
                                                            className="h-full origin-left bg-red-500 transition-all duration-500 ease-out"
                                                            style={{ width: `${progressPercent}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-red-400">
                                                        <span className="material-symbols-outlined text-[12px]">info</span>
                                                        Mua thêm {formatCurrency(amountNeeded)}₫ để dùng mã này
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-2 flex items-center gap-1 text-[10px] text-green-400">
                                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                    Đủ điều kiện áp dụng
                                                </div>
                                            )}

                                            <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-500">
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
            </div>
        </>,
        document.body
    );
};

export default CouponModal;
