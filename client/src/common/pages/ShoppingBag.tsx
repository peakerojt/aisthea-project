import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { CartItem } from '@/types';
import { useAuth } from '@/common/contexts/AuthContext';
import { useToast } from '@/common/contexts/ToastContext';
import { useCart } from '@/common/contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { CheckoutProgress } from '@/common/components/CheckoutProgress';
import { OrderSummaryRail } from '@/common/components/OrderSummaryRail';
import { formatCurrencyVND } from '@/common/utils/currency';

interface ShoppingBagProps {
    cart?: CartItem[];
    updateQuantity?: (id: string, delta: number) => void;
    removeItem?: (id: string) => void;
}

export const ShoppingBag: React.FC<ShoppingBagProps> = ({ cart: propCart, updateQuantity: propUpdateQuantity, removeItem: propRemoveItem }) => {
    const { t } = useTranslation('pages', { keyPrefix: 'shoppingBag' });
    const { t: pagesT } = useTranslation('pages');
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { items, updateItem, removeItem: removeCartItem } = useCart();

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
            const name = item.name || item.productName || variant?.product?.name || 'Sản phẩm';
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

    const updateQuantity = propUpdateQuantity ?? ((id: string, delta: number) => {
        const target = cart.find(i => i.id === id);
        if (!target) return;
        const newQty = Math.max(1, target.quantity + delta);
        const targetId = target.cartItemId ?? target.variantId ?? Number(id);
        updateItem(targetId, newQty);
    });

    const removeItem = propRemoveItem ?? ((id: string) => {
        const target = cart.find(i => i.id === id);
        if (!target) return;
        const targetId = target.cartItemId ?? target.variantId ?? Number(id);
        removeCartItem(targetId);
    });

    const viewProduct = (productId?: string) => {
        if (!productId) return;
        navigate(`/product/${productId}`);
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal;
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
        <div className="bg-bg-dark text-white font-display overflow-x-hidden min-h-screen flex flex-col">
            <Header />

            <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-28">
                <div className="mb-10">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                        {t('meta.kicker')}
                    </p>
                    <div className="mb-5 flex flex-col gap-4 border-b border-border-dark pb-6 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                                {t('title')} <span className="text-gray-600 text-2xl align-top ml-2">({cart.length})</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                                {t('meta.subtitle')}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/collection')}
                            className="cursor-pointer text-sm font-medium text-gray-400 underline decoration-1 underline-offset-4 transition-colors hover:text-white"
                        >
                            {t('actions.continueShopping')}
                        </button>
                    </div>
                    <CheckoutProgress currentStep="cart" steps={progressSteps} />
                </div>

                {cart.length === 0 ? (
                    <div className="rounded-sm border border-border-dark bg-surface-dark px-6 py-20 text-center text-gray-500">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-50">shopping_bag</span>
                        <p className="text-xl font-medium mb-4">{t('empty.title')}</p>
                        <button onClick={() => navigate('/collection')} className="cursor-pointer bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700">{t('actions.startShopping')}</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-start gap-10 lg:flex-row lg:gap-12">
                        {/* Cart Items */}
                        <div className="w-full lg:w-2/3">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-bold uppercase tracking-wide text-gray-200">{t('selection.title')}</h2>
                                <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                                    {cart.length} {t('summary.itemsCount')}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {cart.map((item, i) => (
                                    <article key={i} className="group relative rounded-sm border border-border-dark bg-surface-dark p-5 transition-colors hover:border-white/15 hover:bg-white/[0.02] sm:p-6">
                                        <div className="flex flex-col gap-6 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={() => viewProduct(item.productId)}
                                                disabled={!item.productId}
                                                className={`w-full shrink-0 overflow-hidden rounded-sm bg-neutral-800 text-left sm:w-[120px] ${item.productId ? 'cursor-pointer transition-opacity hover:opacity-85' : 'cursor-default'}`}
                                            >
                                                <img src={item.image} alt={item.name} className="block aspect-[3/4] w-full object-cover" />
                                            </button>
                                            <div className="flex flex-1 flex-col justify-between gap-6">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => viewProduct(item.productId)}
                                                            disabled={!item.productId}
                                                            className={`text-left text-lg font-bold sm:text-xl ${item.productId ? 'cursor-pointer text-white transition-colors hover:text-primary' : 'cursor-default text-white'}`}
                                                        >
                                                            {item.name}
                                                        </button>
                                                        <p className="mt-1 text-sm font-normal text-gray-500">Ref. {item.ref}</p>
                                                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                                                            <span className="flex items-center gap-2">
                                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color === 'Onyx' || item.color === 'Black' || item.color === 'Midnight Black' ? '#111' : '#555' }}></span>
                                                                {t('selection.color')}: {item.color}
                                                            </span>
                                                            <span className="border-l border-neutral-700 pl-6">{t('selection.size')}: {item.size}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-left lg:text-right">
                                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">{t('summary.linePrice')}</p>
                                                        <p className="mt-2 text-xl font-black text-white">{formatCurrencyVND(item.price * item.quantity)}</p>
                                                        <p className="mt-1 text-xs text-gray-500">{formatCurrencyVND(item.price)} x {item.quantity}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-4 border-t border-border-dark pt-5 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex h-11 w-fit items-center border border-border-dark">
                                                        <button onClick={() => item.id && updateQuantity(item.id, -1)} className="flex h-full w-11 cursor-pointer items-center justify-center text-white transition-colors hover:bg-white/5"><span className="material-symbols-outlined text-[18px]">remove</span></button>
                                                        <span className="w-12 text-center text-sm font-medium">{item.quantity}</span>
                                                        <button onClick={() => item.id && updateQuantity(item.id, 1)} className="flex h-full w-11 cursor-pointer items-center justify-center text-white transition-colors hover:bg-white/5"><span className="material-symbols-outlined text-[18px]">add</span></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-5">
                                                        <button onClick={() => item.id && removeItem(item.id)} className="flex cursor-pointer items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-white"><span className="material-symbols-outlined text-[16px]">close</span> {t('actions.remove')}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="w-full lg:w-1/3">
                            <OrderSummaryRail
                                className="sticky top-32"
                                title={t('summary.title', { count: cart.length })}
                                items={cart}
                            >
                                <div className="mb-6 border-t border-border-dark pt-6">
                                    <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4">
                                        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold leading-none tracking-tight text-white">
                                            {t('summary.couponAtCheckout')}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-border-dark pt-6 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">{t('summary.subtotal')}</span>
                                        <span className="font-medium text-white">{formatCurrencyVND(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">{t('summary.shipping')}</span>
                                        <span className="font-medium text-white/65">{t('summary.shippingPending')}</span>
                                    </div>
                                </div>

                                <div className="mb-8 mt-6 flex items-end justify-between border-t border-border-dark pt-6">
                                    <span className="text-base font-bold uppercase tracking-tight">{t('summary.total')}</span>
                                    <div className="text-right">
                                        <span className="block text-2xl font-black tracking-tight">{formatCurrencyVND(total)}</span>
                                        <span className="text-[11px] text-gray-500">{t('summary.totalHint')}</span>
                                    </div>
                                </div>

                                <button onClick={() => {
                                    if (!user) {
                                        showToast({
                                            type: 'info',
                                            title: 'Yêu cầu đăng nhập',
                                            subtitle: 'Vui lòng đăng nhập để thanh toán'
                                        });
                                        navigate('/login');
                                    } else {
                                        navigate('/checkout');
                                    }
                                }} className="group flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-primary text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all hover:bg-red-700">
                                    {t('actions.checkout')} <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </button>
                                <button
                                    onClick={() => navigate('/collection')}
                                    className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 border border-border-dark px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    {t('actions.continueShopping')}
                                </button>
                            </OrderSummaryRail>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

