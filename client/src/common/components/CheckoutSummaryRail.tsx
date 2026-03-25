import React, { type FormEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderSummaryRail } from '@/common/components/OrderSummaryRail';
import { CheckoutSummaryRailProps } from '@/common/types/checkout.types';
import { formatCurrencyVND } from '@/common/utils/currency';

export const CheckoutSummaryRail: React.FC<CheckoutSummaryRailProps> = ({
    appliedCoupon,
    cart,
    couponError,
    couponSuccessMsg,
    discountValue,
    handlePlaceOrder,
    handleRemoveCoupon,
    isQuoteLoading,
    loading,
    onOpenCouponModal,
    selectedCityCode,
    shippingFee,
    subtotal,
    total,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation('pages', { keyPrefix: 'checkout' });
    const isSubmitting = loading || (Boolean(selectedCityCode) && isQuoteLoading);
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };

    return (
        <div className="w-full md:w-2/5 lg:w-1/3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <OrderSummaryRail
                className="sticky top-32"
                title={resolveText('summary.title', 'Đơn hàng ({{count}} sản phẩm)', { count: cart.length })}
                items={cart}
                maxHeightClassName="max-h-[300px]"
            >
                <div className="mb-6 border-t border-border-dark pt-6">
                    {!appliedCoupon ? (
                        <div>
                            <button
                                type="button"
                                onClick={onOpenCouponModal}
                                className="group flex w-full items-center justify-between rounded-sm border border-primary/50 bg-surface-dark px-4 py-3 text-primary shadow-[0_0_10px_rgba(255,0,0,0.1)] transition-colors hover:bg-primary/10"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold">
                                    <span className="material-symbols-outlined text-xl">local_activity</span>
                                    {resolveText('coupon.chooseOrEnter', 'Chọn hoặc nhập mã giảm giá')}
                                </span>
                                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward_ios</span>
                            </button>
                            {couponError && <p className="mt-2 text-xs text-red-400 animate-fade-in-up">{couponError}</p>}
                        </div>
                    ) : (
                        <div className="rounded-sm border border-green-500/30 bg-green-900/20 p-3 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm font-bold text-green-400">
                                    <span className="material-symbols-outlined text-[16px]">local_offer</span>
                                    {appliedCoupon.code}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveCoupon}
                                    className="text-xs font-bold uppercase text-gray-400 transition-colors hover:text-red-400"
                                >
                                    {resolveText('coupon.remove', 'Gỡ mã')}
                                </button>
                            </div>
                            {couponSuccessMsg && <p className="mt-1 text-xs text-green-400/80">{couponSuccessMsg}</p>}
                        </div>
                    )}
                </div>

                <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                    <div className="flex justify-between text-gray-400">
                        <span>{resolveText('summary.subtotal', 'Tạm tính')}</span>
                        <span className="text-white">{formatCurrencyVND(subtotal)}</span>
                    </div>
                    <div className="flex items-start justify-between text-gray-400">
                        <span>{resolveText('summary.shippingFee', 'Phí vận chuyển')}</span>
                        <span className={`text-right ${shippingFee === 0 && selectedCityCode ? 'font-bold text-green-500' : 'text-white'}`}>
                            {!selectedCityCode ? '---' : (shippingFee === 0 ? resolveText('shipping.free', 'Miễn phí') : formatCurrencyVND(shippingFee))}
                        </span>
                    </div>
                    {appliedCoupon && (
                        <div className="flex justify-between font-medium text-green-400 animate-fade-in-up">
                            <span>{resolveText('summary.discount', 'Giảm giá ({{code}})', { code: appliedCoupon.code })}</span>
                            <span>-{formatCurrencyVND(discountValue)}</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border-dark pt-6">
                    <span className="text-base font-bold uppercase tracking-tighter">{resolveText('summary.total', 'Tổng cộng')}</span>
                    <span className="text-2xl font-black text-primary">{formatCurrencyVND(total)}</span>
                </div>

                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/cart')}
                        className="flex w-full items-center justify-center gap-1 text-xs font-bold uppercase text-gray-400 transition-colors hover:text-white sm:w-auto"
                    >
                        <span className="material-symbols-outlined text-[16px]">arrow_back_ios</span>
                        {resolveText('actions.backToCart', 'Quay lại giỏ hàng')}
                    </button>
                    <button
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isSubmitting}
                        className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-primary text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:bg-red-700 shadow-primary/20'}`}
                    >
                        {isSubmitting
                            ? resolveText('actions.processing', 'Đang xử lý...')
                            : resolveText('actions.placeOrder', 'Đặt hàng')}
                    </button>
                </div>
            </OrderSummaryRail>
        </div>
    );
};
