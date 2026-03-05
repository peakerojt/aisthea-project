import { httpClient } from './httpClient';

// ─── Kiểu dữ liệu phản hồi từ API ───────────────────────────────────────────

export interface CartVariantAttribute {
    value: {
        value: string;
        attribute: { name: string };
    };
}

export interface CartItemVariant {
    variantId: number;
    price: number;
    sku: string;
    stockQuantity: number;
    product: {
        productId: number;
        name: string;
        slug: string;
        images: { imageUrl: string; thumbnailUrl?: string }[];
    };
    variantAttributes: CartVariantAttribute[];
}

export interface CartItemResponse {
    cartItemId: number;
    cartId: number;
    variantId: number;
    quantity: number;
    variant: CartItemVariant;
}

export interface CartResponse {
    cartId: number;
    userId: number | null;
    items: CartItemResponse[];
}

export interface ApiCartResponse {
    success: boolean;
    data: CartResponse;
    code?: string;
}

// ─── Local guest cart (localStorage) ─────────────────────────────────────────

export interface GuestCartItem {
    variantId: number;
    quantity: number;
    /** Dữ liệu UI tạm (chỉ lưu ở guest, không gửi lên server) */
    productName?: string;
    variantName?: string;
    price?: number;
    imageUrl?: string;
    stockQuantity?: number;
}

export const GUEST_CART_KEY = 'aisthea_guest_cart';

export const getGuestCart = (): GuestCartItem[] => {
    try {
        const raw = localStorage.getItem(GUEST_CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveGuestCart = (items: GuestCartItem[]): void => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const clearGuestCart = (): void => {
    localStorage.removeItem(GUEST_CART_KEY);
};

// ─── API calls (user đã đăng nhập) ──────────────────────────────────────────

export const fetchCartApi = async (): Promise<CartResponse> => {
    const response = await httpClient.get<ApiCartResponse>('/api/cart');
    return response.data.data;
};

export const addToCartApi = async (variantId: number, quantity: number): Promise<CartResponse> => {
    const response = await httpClient.post<ApiCartResponse>('/api/cart/add', { variantId, quantity });
    return response.data.data;
};

export const updateCartItemApi = async (cartItemId: number, quantity: number): Promise<CartResponse> => {
    const response = await httpClient.put<ApiCartResponse>('/api/cart/update', { cartItemId, quantity });
    return response.data.data;
};

export const removeCartItemApi = async (cartItemId: number): Promise<CartResponse> => {
    const response = await httpClient.delete<ApiCartResponse>(`/api/cart/item/${cartItemId}`);
    return response.data.data;
};

export const mergeCartApi = async (items: { variantId: number; quantity: number }[]): Promise<CartResponse> => {
    const response = await httpClient.post<ApiCartResponse>('/api/cart/merge', { items });
    return response.data.data;
};

export const clearCartApi = async (): Promise<CartResponse> => {
    const response = await httpClient.delete<ApiCartResponse>('/api/cart/clear');
    return response.data.data;
};
