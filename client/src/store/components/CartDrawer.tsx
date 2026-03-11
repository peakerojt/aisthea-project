import React, { useEffect, useRef } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/common/contexts/CartContext';
import { ViewState, CartItem } from '@/types';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
    setView?: (view: ViewState) => void;
    cartItems?: CartItem[];
    updateQuantity?: (id: string, newQuantity: number) => void;
    removeItem?: (id: string) => void;
}

function getVariantLabel(item: any): string {
    if (item.variant) {
        return item.variant.variantAttributes
            .map((va: any) => `${va.value.attribute.name}: ${va.value.value}`)
            .join(', ');
    }
    const parts = [];
    if (item.color && item.color !== 'N/A') parts.push(`Color: ${item.color}`);
    if (item.size && item.size !== 'N/A') parts.push(`Size: ${item.size}`);
    return parts.join(', ');
}

function getImageUrl(item: any): string {
    if (item.variant) {
        const imgs = item.variant.product.images;
        return imgs?.[0]?.thumbnailUrl ?? imgs?.[0]?.imageUrl ?? '';
    }
    return item.imageUrl ?? '';
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onCheckout }) => {
    const { t } = useTranslation('cart');
    const { items, totalItems, cartTotal, isLoading, removeItem, updateItem, clearCart, getStockStatus } = useCart();
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handler);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handler);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const dbItems = items as any[];

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-hidden="true"
            />
            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('title')}
                className={`fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col bg-[#0f0f0f]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl shadow-black/50 transition-transform duration-400 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <ShoppingBag size={20} className="text-primary" />
                        <h2 className="text-white font-bold text-lg tracking-wide uppercase">{t('title')}</h2>
                        {totalItems > 0 && (
                            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 cursor-pointer"
                        aria-label={t('actions.continueShopping')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : dbItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <ShoppingCart size={36} className="text-gray-600" />
                        </div>
                        <p className="text-white font-semibold text-lg">{t('empty.title')}</p>
                        <p className="text-gray-500 text-sm text-center">{t('empty.subtitle')}</p>
                        <button
                            onClick={onClose}
                            className="mt-2 px-6 py-2.5 bg-primary hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
                        >
                            {t('actions.continueShopping')}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        {dbItems.map(item => {
                            const stockStatus = getStockStatus(item);
                            const imgUrl = getImageUrl(item);
                            const label = getVariantLabel(item);
                            const stock = item.variant?.stockQuantity ?? item.stockQuantity ?? 99999;
                            const targetId = item.cartItemId || item.variantId;
                            const productName = item.variant?.product?.name || item.productName || 'Sản phẩm';
                            const price = Number(item.variant?.price || item.price || 0);

                            return (
                                <div
                                    key={targetId}
                                    className="group flex gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-200"
                                >
                                    <div className="relative w-16 h-20 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
                                        {imgUrl ? (
                                            <img src={getCloudinaryProductCard(imgUrl)} alt={productName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingBag size={20} className="text-gray-600" />
                                            </div>
                                        )}
                                        {stockStatus === 'out' && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <span className="text-red-400 text-[9px] font-bold uppercase px-1 text-center leading-tight">
                                                    {t('stock.outOfStock')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{productName}</p>
                                        {label && <p className="text-gray-500 text-xs mt-0.5 truncate">{label}</p>}
                                        {stockStatus === 'out' && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
                                                <span className="text-red-400 text-[11px] font-medium">{t('stock.outOfStock')}</span>
                                            </div>
                                        )}
                                        {stockStatus === 'low' && stock > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                                                <span className="text-amber-400 text-[11px] font-medium">{t('stock.lowStock', { count: stock })}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mt-2.5">
                                            <span className="text-primary font-bold text-sm">
                                                {(price * item.quantity).toLocaleString('vi-VN')}₫
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => updateItem(targetId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-sm bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-40" disabled={isLoading} aria-label="Giảm">
                                                    <Minus size={11} />
                                                </button>
                                                <span className="text-white text-sm font-semibold w-7 text-center">{item.quantity}</span>
                                                <button onClick={() => updateItem(targetId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-sm bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-40" disabled={isLoading || stockStatus === 'out'} aria-label="Tăng">
                                                    <Plus size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={() => removeItem(targetId)} className="self-start mt-0.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all cursor-pointer p-1" disabled={isLoading} aria-label={t('actions.remove')}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {dbItems.length > 0 && (
                    <div className="border-t border-white/10 px-6 py-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{t('summary.subtotal')}</span>
                            <span className="text-white font-bold text-lg">{cartTotal.toLocaleString('vi-VN')}₫</span>
                        </div>
                        <button onClick={onCheckout} className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-60" disabled={isLoading}>
                            {t('actions.checkout')}
                        </button>
                        <button onClick={clearCart} className="w-full text-gray-500 hover:text-red-400 text-xs font-medium transition-colors cursor-pointer py-1 uppercase tracking-wider" disabled={isLoading}>
                            {t('actions.clearCart')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
