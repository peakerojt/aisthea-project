import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { CartItem } from '@/types';
import { useAuth } from '@/common/contexts/AuthContext';
import { useToast } from '@/common/contexts/ToastContext';
import { useCart } from '@/common/contexts/CartContext';
import { useTranslation } from 'react-i18next';

interface ShoppingBagProps {
    cart?: CartItem[];
    updateQuantity?: (id: string, delta: number) => void;
    removeItem?: (id: string) => void;
}

export const ShoppingBag: React.FC<ShoppingBagProps> = ({ cart: propCart, updateQuantity: propUpdateQuantity, removeItem: propRemoveItem }) => {
    const { t } = useTranslation('pages', { keyPrefix: 'shoppingBag' });
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

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    return (
        <div className="bg-bg-dark text-white font-display overflow-x-hidden min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-28">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-dark pb-6">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{t('title')} <span className="text-gray-600 text-2xl align-top ml-2">({cart.length})</span></h1>
                    <button onClick={() => navigate('/collection')} className="text-sm font-medium text-gray-400 hover:text-white underline decoration-1 underline-offset-4 transition-colors">{t('actions.continueShopping')}</button>
                </div>

                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-50">shopping_bag</span>
                        <p className="text-xl font-medium mb-4">{t('empty.title')}</p>
                        <button onClick={() => navigate('/collection')} className="bg-primary text-white px-8 py-3 rounded text-sm font-bold uppercase tracking-wider hover:bg-red-700 transition-colors">{t('actions.startShopping')}</button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-12 xl:gap-20 items-start relative">
                        {/* Cart Items */}
                        <div className="w-full lg:w-2/3 flex flex-col gap-0">
                            <h2 className="text-lg font-bold uppercase tracking-wide mb-6 text-gray-200">{t('selection.title')}</h2>

                            {cart.map((item, i) => (
                                <div key={i} className="group relative flex flex-col sm:flex-row gap-6 py-8 border-b border-border-dark transition-colors hover:bg-white/[0.02]">
                                    <div className="w-full sm:w-[120px] shrink-0 aspect-[3/4] rounded-sm overflow-hidden bg-neutral-800">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-1 flex-col justify-between">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{item.name}</h3>
                                                <p className="text-sm text-gray-500 mb-4 font-normal">Ref. {item.ref}</p>
                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color === 'Onyx' || item.color === 'Black' || item.color === 'Midnight Black' ? '#111' : '#555' }}></span> {t('selection.color')}: {item.color}</span>
                                                    <span className="border-l border-neutral-700 pl-6">{t('selection.size')}: {item.size}</span>
                                                </div>
                                            </div>
                                            <p className="text-lg font-medium text-white whitespace-nowrap">${item.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-end justify-between mt-6">
                                            <div className="flex items-center border border-border-dark rounded-sm h-10 w-fit">
                                                <button onClick={() => item.id && updateQuantity(item.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-white"><span className="material-symbols-outlined text-[18px]">remove</span></button>
                                                <span className="w-12 text-center text-sm font-medium">{item.quantity}</span>
                                                <button onClick={() => item.id && updateQuantity(item.id, 1)} className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-white"><span className="material-symbols-outlined text-[18px]">add</span></button>
                                            </div>
                                            <div className="flex gap-6">
                                                <button className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">favorite</span> {t('actions.save')}</button>
                                                <button onClick={() => item.id && removeItem(item.id)} className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">close</span> {t('actions.remove')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="w-full lg:w-1/3 lg:sticky lg:top-28">
                            <div className="bg-surface-dark border border-border-dark rounded-sm p-8 shadow-xl">
                                <h2 className="text-lg font-bold uppercase tracking-wide mb-8 pb-4 border-b border-border-dark">{t('summary.title')}</h2>
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400">{t('summary.subtotal')}</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400">{t('summary.shipping')}</span><span className="text-green-400 font-medium">{t('summary.free')}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-gray-400 flex items-center gap-1">{t('summary.estimatedTax')} <span className="material-symbols-outlined text-[14px]">help</span></span><span className="font-medium">${tax.toFixed(2)}</span></div>
                                </div>

                                <div className="mb-8">
                                    <div className="flex gap-2 h-11">
                                        <input type="text" placeholder={t('summary.promoPlaceholder')} className="flex-1 bg-transparent border border-border-dark rounded-sm px-3 text-sm text-white placeholder:text-gray-600 focus:ring-1 focus:ring-white transition-all" />
                                        <button className="px-4 text-xs font-bold uppercase tracking-wide text-white border border-border-dark rounded-sm hover:bg-white/5">{t('summary.apply')}</button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-8 pt-6 border-t border-border-dark">
                                    <span className="text-base font-bold uppercase tracking-tight">{t('summary.total')}</span>
                                    <div className="text-right">
                                        <span className="block text-2xl font-black tracking-tight">${total.toFixed(2)}</span>
                                        <span className="text-[11px] text-gray-500">{t('summary.includesVat')}</span>
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
                                }} className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-widest h-14 rounded-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group">
                                    {t('actions.checkout')} <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-6">{t('summary.noteLine1')} <br />{t('summary.noteLine2')}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

