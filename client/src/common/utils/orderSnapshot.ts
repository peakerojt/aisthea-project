import { CartItem } from '@/types';

export interface LatestOrderData {
    orderId?: number;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    district: string;
    city: string;
    ward: string;
    note: string;
    paymentMethod: 'COD' | 'VNPAY';
    shippingMethod: 'STANDARD' | 'EXPRESS';
    shippingFee: number;
    discountValue: number;
    subtotal: number;
    total: number;
    items: CartItem[];
}

const STORAGE_KEY = 'latestOrderData';

export const getLatestOrderData = (): LatestOrderData | null => {
    if (typeof window === 'undefined') return null;

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as LatestOrderData;
    } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

export const setLatestOrderData = (data: LatestOrderData): void => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
