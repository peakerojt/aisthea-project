import { logger } from '../lib/logger';

export type ReturnEventType =
    | 'RETURN_REQUESTED'
    | 'RETURN_APPROVED'
    | 'RETURN_REJECTED'
    | 'RETURN_RECEIVED'
    | 'RETURN_REFUNDED';

export interface NotificationPayload {
    returnRequestId: number;
    orderId: number;
    customerEmail?: string;
    customerName?: string;
    status?: string;
    comment?: string;
    refundAmount?: number;
    refundMethod?: string;
}

const TEMPLATES: Record<ReturnEventType, (p: NotificationPayload) => string> = {
    RETURN_REQUESTED: (p) => `[📦 Return Requested] Return #${p.returnRequestId} (Order #${p.orderId}) has been submitted. We will review within 24h.`,
    RETURN_APPROVED: (p) => `[✅ Return Approved] Your return #${p.returnRequestId} for Order #${p.orderId} has been APPROVED. Please ship the item(s) back.`,
    RETURN_REJECTED: (p) => `[❌ Return Rejected] Your return #${p.returnRequestId} for Order #${p.orderId} has been REJECTED. Reason: ${p.comment ?? 'N/A'}.`,
    RETURN_RECEIVED: (p) => `[📬 Package Received] We received your return #${p.returnRequestId}. Processing refund soon.`,
    RETURN_REFUNDED: (p) => `[💰 Refunded] Return #${p.returnRequestId}: ${p.refundAmount?.toLocaleString()} VND refunded via ${p.refundMethod}.`,
};

export function notifyCustomer(event: ReturnEventType, payload: NotificationPayload): void {
    logger.info('NOTIFICATION', {
        type: 'NOTIFICATION',
        event,
        to: payload.customerEmail ?? 'unknown',
        customerName: payload.customerName,
        returnRequestId: payload.returnRequestId,
        orderId: payload.orderId,
        message: TEMPLATES[event](payload),
    });
}
