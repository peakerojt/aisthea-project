import { emitOrderStatusUpdated } from '../../socket';

// Update the emitOrderStatusUpdated function signature to accept logistics fields
// (this is just type documentation - actual changes are in socket.ts)
export type OrderStatusUpdatedPayload = {
    orderId: number;
    userId?: number | null;
    status: string;
    timeline: unknown[];
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDeliveryDate?: Date | null;
};

export { emitOrderStatusUpdated };
