import { httpClient } from './httpClient';

export interface OrderItem {
    orderItemId: number;
    productId: string | null;
    sku: string;
    productName: string;
    variant: string;
    variantName: string;
    price: number;
    quantity: number;
    subtotal: number;
    thumbnail: string | null;
    thumbnailUrl: string | null;
    isReviewed?: boolean;
    reviewId?: number | null;
}

export interface OrderTimelineItem {
    status: string;
    at: string;
}

export interface OrderPricing {
    itemsTotal: number;
    shippingFee: number;
    discount: number;
    tax: number;
    grandTotal: number;
}

export interface OrderDetail {
    id: string;
    orderId: string; // Used in some places
    orderCode: string;
    status: string;
    paymentMethod: string | null;
    paymentStatus: string | null;
    createdAt: string | null;
    customer: {
        name: string;
        phone: string;
        email: string | null;
    };
    shippingAddress: {
        recipientName: string;
        recipientPhone: string;
        addressLine: string;
        ward: string | null;
        district: string | null;
        city: string;
    };
    items: OrderItem[];
    pricing: OrderPricing;
    timeline: OrderTimelineItem[];
    note: string | null;
}

export const fetchOrderDetail = async (id: string): Promise<OrderDetail> => {
    const response = await httpClient.get(`/api/orders/${id}`);
    return response.data.data;
};

export const cancelOrder = async (id: string): Promise<OrderDetail> => {
    const response = await httpClient.patch(`/api/orders/${id}/cancel`);
    return response.data.data;
};

export const confirmReceipt = async (id: string): Promise<any> => {
    const response = await httpClient.patch(`/api/orders/${id}/confirm-receipt`);
    return response.data;
};
