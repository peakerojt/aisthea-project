import { emitOrderStatusUpdated } from '../../socket';

export type OrderStatusUpdatedPayload = {
    orderId: number;
    userId?: number | null;
    orderCode?: string;
    status: string;
    timeline: unknown[];
    shippingMode?: 'manual' | 'provider';
    provider?: string | null;
    providerOrderCode?: string | null;
    providerStatus?: string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDeliveryDate?: Date | null;
};

export { emitOrderStatusUpdated };
