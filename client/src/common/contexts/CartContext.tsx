import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/common/contexts/AuthContext';
import { useToast } from '@/common/contexts/ToastContext';
import {
    CartItemResponse,
    GuestCartItem,
    getGuestCart,
    saveGuestCart,
    clearGuestCart,
    fetchCartApi,
    addToCartApi,
    updateCartItemApi,
    removeCartItemApi,
    clearCartApi,
} from '@/common/services/cart.service';

// ─── Kiểu dữ liệu Context ────────────────────────────────────────────────────

interface CartContextType {
    /** Danh sách sản phẩm trong giỏ (DB items khi login, GuestCartItem khi guest) */
    items: CartItemResponse[] | GuestCartItem[];
    /** Tổng số lượng sản phẩm */
    totalItems: number;
    /** Tổng giá trị giỏ hàng */
    cartTotal: number;
    /** Trạng thái loading */
    isLoading: boolean;
    /** Thêm / cập nhật sản phẩm vào giỏ */
    addItem: (variantId: number, quantity: number, meta?: Partial<GuestCartItem>) => Promise<void>;
    /** Xoá một sản phẩm */
    removeItem: (cartItemId: number) => Promise<void>;
    /** Cập nhật số lượng */
    updateItem: (cartItemId: number, quantity: number) => Promise<void>;
    /** Xoá toàn bộ giỏ */
    clearCart: () => Promise<void>;
    /** Tải lại giỏ hàng từ DB */
    fetchCart: () => Promise<void>;
    /** Gộp giỏ guest vào DB sau đăng nhập */
    syncWithMerge: (localItems: GuestCartItem[]) => Promise<void>;
    /** Kiểm tra sản phẩm đang ở trạng thái hết/thiếu hàng */
    getStockStatus: (item: CartItemResponse) => 'ok' | 'low' | 'out';
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation('cart');
    const { user } = useAuth();
    const { showToast: fireToast } = useToast();
    const isAuthenticated = !!user;

    const [dbItems, setDbItems] = useState<CartItemResponse[]>([]);
    const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        fireToast({ type: type === 'success' ? 'success' : 'error', title: message });
    };

    // ─── Computed ──────────────────────────────────────────────────────────
    const items = isAuthenticated ? dbItems : guestItems;

    const totalItems = isAuthenticated
        ? dbItems.reduce((sum, i) => sum + i.quantity, 0)
        : guestItems.reduce((sum, i) => sum + i.quantity, 0);

    const cartTotal = isAuthenticated
        ? dbItems.reduce((sum, i) => sum + i.quantity * Number(i.variant.price), 0)
        : guestItems.reduce((sum, i) => sum + i.quantity * (i.price ?? 0), 0);

    // ─── Tải giỏ hàng từ DB ────────────────────────────────────────────────
    const fetchCart = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const cart = await fetchCartApi();
            setDbItems(cart.items ?? []);
        } catch (err) {
            console.error('[Cart] Lỗi tải giỏ hàng:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // ─── Khởi tạo khi auth thay đổi ────────────────────────────────────────
    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
        } else {
            // Tải giỏ khách từ localStorage
            setGuestItems(getGuestCart());
            setDbItems([]);

            // Listen for cross-tab or manual 'storage' events to keep in sync
            const handleStorageChange = () => {
                setGuestItems(getGuestCart());
            };
            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, [isAuthenticated, fetchCart]);

    // ─── Gộp giỏ khách vào DB sau đăng nhập ────────────────────────────────
    const syncWithMerge = useCallback(async (localItems: GuestCartItem[]) => {
        if (!localItems || localItems.length === 0) {
            await fetchCart();
            return;
        }
        setIsLoading(true);
        try {
            const { mergeCartApi } = await import('@/common/services/cart.service');
            const merged = await mergeCartApi(
                localItems.map(({ variantId, quantity }) => ({ variantId, quantity }))
            );
            setDbItems(merged.items ?? []);
            clearGuestCart();
            setGuestItems([]);
            fireToast({ type: 'success', title: 'Giỏ hàng đã được đồng bộ', subtitle: `${merged.items?.length ?? 0} sản phẩm đã được khôi phục`, duration: 4000 });
        } catch (err) {
            console.error('[Cart] Lỗi gộp giỏ hàng:', err);
            showToast(t('toast.mergeError'), 'error');
            // Dù lỗi vẫn tải giỏ DB nếu có
            await fetchCart();
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, t]);

    // ─── Thêm / cộng dồn sản phẩm ──────────────────────────────────────────
    const addItem = useCallback(async (
        variantId: number,
        quantity: number,
        meta?: Partial<GuestCartItem>
    ) => {
        if (isAuthenticated) {
            setIsLoading(true);
            try {
                const cart = await addToCartApi(variantId, quantity);
                setDbItems(cart.items ?? []);
                showToast(t('toast.added'), 'success');
            } catch (error) {
            const err = error as { response?: { data?: { code?: string; available?: number } } };
                const code = err?.response?.data?.code;
                if (code === 'INSUFFICIENT_STOCK') {
                    const available = err?.response?.data?.available ?? 0;
                    showToast(t('stock.exceedsStock', { count: available }), 'error');
                } else {
                    showToast(t('toast.addError'), 'error');
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            // Chế độ guest: cập nhật localStorage
            setGuestItems(prev => {
                const exists = prev.find(i => i.variantId === variantId);
                let updated: GuestCartItem[];
                if (exists) {
                    const maxQty = meta?.stockQuantity ?? 99999;
                    updated = prev.map(i =>
                        Number(i.variantId) === Number(variantId)
                            ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) }
                            : i
                    );
                } else {
                    updated = [...prev, { variantId, quantity, ...meta }];
                }
                saveGuestCart(updated);
                return updated;
            });
            showToast(t('toast.added'), 'success');
        }
    }, [isAuthenticated, t]);

    // ─── Cập nhật số lượng ──────────────────────────────────────────────────
    const updateItem = useCallback(async (cartItemId: number, quantity: number) => {
        if (isAuthenticated) {
            setIsLoading(true);
            try {
                const cart = await updateCartItemApi(cartItemId, quantity);
                setDbItems(cart.items ?? []);
            } catch (error) {
            const err = error as { response?: { data?: { code?: string; available?: number } } };
                const code = err?.response?.data?.code;
                if (code === 'INSUFFICIENT_STOCK') {
                    const available = err?.response?.data?.available ?? 0;
                    showToast(t('stock.exceedsStock', { count: available }), 'error');
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            setGuestItems(prev => {
                const updated = quantity <= 0
                    ? prev.filter(i => Number(i.variantId) !== Number(cartItemId))
                    : prev.map(i => Number(i.variantId) === Number(cartItemId) ? { ...i, quantity } : i);
                saveGuestCart(updated);
                return updated;
            });
        }
    }, [isAuthenticated, t]);

    // ─── Xoá một sản phẩm ──────────────────────────────────────────────────
    const removeItem = useCallback(async (cartItemId: number) => {
        if (isAuthenticated) {
            setIsLoading(true);
            try {
                const cart = await removeCartItemApi(cartItemId);
                setDbItems(cart.items ?? []);
                showToast(t('toast.removed'), 'success');
            } catch {
                showToast(t('toast.addError'), 'error');
            } finally {
                setIsLoading(false);
            }
        } else {
            setGuestItems(prev => {
                const updated = prev.filter(i => Number(i.variantId) !== Number(cartItemId));
                saveGuestCart(updated);
                return updated;
            });
            showToast(t('toast.removed'), 'success');
        }
    }, [isAuthenticated, t]);

    // ─── Xoá toàn bộ giỏ ───────────────────────────────────────────────────
    const clearCart = useCallback(async () => {
        if (isAuthenticated) {
            setIsLoading(true);
            try {
                await clearCartApi();
                setDbItems([]);
                showToast(t('toast.cleared'), 'success');
            } catch {
                showToast(t('toast.addError'), 'error');
            } finally {
                setIsLoading(false);
            }
        } else {
            clearGuestCart();
            setGuestItems([]);
            showToast(t('toast.cleared'), 'success');
        }
    }, [isAuthenticated, t]);

    // ─── Kiểm tra trạng thái tồn kho ───────────────────────────────────────
    const getStockStatus = useCallback((item: CartItemResponse): 'ok' | 'low' | 'out' => {
        const stock = item.variant.stockQuantity ?? 99999;
        if (stock === 0) return 'out';
        if (item.quantity > stock) return 'out';
        if (stock <= 5) return 'low';
        return 'ok';
    }, []);

    return (
        <CartContext.Provider value={{
            items,
            totalItems,
            cartTotal,
            isLoading,
            addItem,
            removeItem,
            updateItem,
            clearCart,
            fetchCart,
            syncWithMerge,
            getStockStatus,
        }}>
            {children}
        </CartContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart phải được dùng bên trong CartProvider');
    }
    return context;
};
