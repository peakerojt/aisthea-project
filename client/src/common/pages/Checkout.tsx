import React, { useState, useMemo } from 'react';
import { CartItem } from '@/types';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { CouponModal } from '@/common/components/CouponModal';
import { CheckoutContactSection } from '@/common/components/CheckoutContactSection';
import { useCart } from '@/common/contexts/CartContext';
import { CartItemResponse, GuestCartItem } from '@/common/services/cart.service';
import { CheckoutPaymentSection } from '@/common/components/CheckoutPaymentSection';
import { useTranslation } from 'react-i18next';
import { CheckoutProgress } from '@/common/components/CheckoutProgress';
import { CheckoutSummaryRail } from '@/common/components/CheckoutSummaryRail';
import { CheckoutShippingSection } from '@/common/components/CheckoutShippingSection';
import vnpayLogo from '@/assets/images/vnpay-logo.png';
import { useCheckoutForm } from '@/common/hooks/useCheckoutForm';
import { useCheckoutPricing } from '@/common/hooks/useCheckoutPricing';
import { useCheckoutSubmit } from '@/common/hooks/useCheckoutSubmit';

interface CheckoutProps {
    cart?: CartItem[];
}

const mapCartContextItem = (
    item: CartItemResponse | GuestCartItem,
    index: number,
    fallbackName: string,
): CartItem => {
    const variant = 'variant' in item ? item.variant : undefined;
    const guestItem = 'productName' in item ? item : undefined;
    const id = String(
        ('cartItemId' in item ? item.cartItemId : undefined)
        ?? item.variantId
        ?? `guest-${item.variantId}-${index}`,
    );

    return {
        cartItemId: 'cartItemId' in item ? item.cartItemId : undefined,
        id,
        productId: variant?.product.productId?.toString(),
        variantId: variant?.variantId ?? item.variantId,
        name: guestItem?.productName || variant?.product.name || fallbackName,
        price: Number(guestItem?.price ?? variant?.price ?? 0),
        image: guestItem?.imageUrl
            || variant?.product.images?.[0]?.thumbnailUrl
            || variant?.product.images?.[0]?.imageUrl
            || '',
        color: guestItem?.color || guestItem?.variantName || '',
        size: guestItem?.size || guestItem?.variantName || variant?.sku || '',
        quantity: item.quantity ?? 1,
        ref: variant?.sku || variant?.product.slug || '',
    };
};

const Checkout: React.FC<CheckoutProps> = ({ cart: propCart }) => {
    const { t } = useTranslation('pages', { keyPrefix: 'checkout' });
    const { t: pagesT } = useTranslation('pages');
    const inputClassName = 'w-full rounded-sm border border-border-dark bg-surface-dark px-4 py-3 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-white focus:outline-none';
    const selectClassName = 'w-full appearance-none rounded-sm border border-border-dark bg-surface-dark px-4 py-3 pr-9 text-sm transition-colors focus:border-white focus:outline-none';
    const fieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300';
    const { user } = useAuth();
    const { items, fetchCart, reconcileCheckoutStock } = useCart();

    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const selectedShippingMethod: 'STANDARD' = 'STANDARD';
    const fieldErrorClassName = 'mt-1 text-xs text-red-400';
    const mappedCart = useMemo<CartItem[]>(() => {
        return items.map((item, index) => mapCartContextItem(item, index, t('fallback.productName')));
    }, [items, t]);

    const cart = propCart ?? mappedCart;
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const {
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
    } = useCheckoutForm({ user });
    const {
        appliedCoupon,
        appliedCouponCode,
        couponError,
        couponSuccessMsg,
        discountValue,
        fetchQuote,
        handleApplyCoupon,
        handleRemoveCoupon,
        isQuoteLoading,
        pricingQuote,
        shippingFee,
        standardPreviewFee,
        total,
    } = useCheckoutPricing({
        cart,
        selectedCityCode,
        selectedShippingMethod,
        subtotal,
        user,
    });
    const { handlePlaceOrder, loading } = useCheckoutSubmit({
        apiFieldToFormField,
        appliedCouponCode,
        cart,
        fetchCart,
        fetchQuote,
        formData,
        pricingQuote,
        reconcileCheckoutStock,
        selectedCityCode,
        selectedShippingMethod,
        setError,
        setFieldValidationErrors,
        user,
        validateForm,
    });

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

                        <CheckoutContactSection
                            fieldErrorClassName={fieldErrorClassName}
                            fieldLabelClassName={fieldLabelClassName}
                            formData={formData}
                            getFieldError={getFieldError}
                            handleInputChange={handleInputChange}
                            inputClassName={inputClassName}
                            t={t}
                        />

                        <CheckoutShippingSection
                            districts={districts}
                            fieldErrorClassName={fieldErrorClassName}
                            fieldLabelClassName={fieldLabelClassName}
                            formData={formData}
                            formatSavedAddressOption={formatSavedAddressOption}
                            getFieldError={getFieldError}
                            handleDistrictChange={handleDistrictChange}
                            handleInputChange={handleInputChange}
                            handleProvinceChange={handleProvinceChange}
                            handleSavedAddressChange={handleSavedAddressChange}
                            handleWardChange={handleWardChange}
                            inputClassName={inputClassName}
                            isSavedAddressLoading={isSavedAddressLoading}
                            provinces={provinces}
                            savedAddresses={savedAddresses}
                            selectClassName={selectClassName}
                            selectedCityCode={selectedCityCode}
                            selectedDistrictCode={selectedDistrictCode}
                            selectedSavedAddress={selectedSavedAddress}
                            selectedSavedAddressId={selectedSavedAddressId}
                            selectedWardCode={selectedWardCode}
                            standardPreviewFee={standardPreviewFee}
                            subtotal={subtotal}
                            t={t}
                            wards={wards}
                        />

                        <CheckoutPaymentSection
                            formData={formData}
                            handleInputChange={handleInputChange}
                            t={t}
                            vnpayLogo={vnpayLogo}
                        />

                    </form>
                </div>

                <CheckoutSummaryRail
                    appliedCoupon={appliedCoupon}
                    cart={cart}
                    couponError={couponError}
                    couponSuccessMsg={couponSuccessMsg}
                    discountValue={discountValue}
                    handlePlaceOrder={handlePlaceOrder}
                    handleRemoveCoupon={handleRemoveCoupon}
                    isQuoteLoading={isQuoteLoading}
                    loading={loading}
                    onOpenCouponModal={() => setIsCouponModalOpen(true)}
                    selectedCityCode={selectedCityCode}
                    shippingFee={shippingFee}
                    subtotal={subtotal}
                    total={total}
                />
            </main>

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

