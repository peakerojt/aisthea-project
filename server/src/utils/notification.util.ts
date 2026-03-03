/**
 * notification.util.ts
 * Mock notification service — logs to console in lieu of real email/SMS.
 * In production: replace with nodemailer / SendGrid / SES calls.
 */

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

/**
 * Sends (mocked) notification to the customer about a return status change.
 * Structured log so output is easy to parse in dev/staging.
 */
export function notifyCustomer(event: ReturnEventType, payload: NotificationPayload): void {
    const templates: Record<ReturnEventType, string> = {
        RETURN_REQUESTED: `[📦 Return Requested] Return #${payload.returnRequestId} (Order #${payload.orderId}) has been submitted. We will review within 24h.`,
        RETURN_APPROVED: `[✅ Return Approved] Your return #${payload.returnRequestId} for Order #${payload.orderId} has been APPROVED. Please ship the item(s) back.`,
        RETURN_REJECTED: `[❌ Return Rejected] Your return #${payload.returnRequestId} for Order #${payload.orderId} has been REJECTED. Reason: ${payload.comment ?? 'N/A'}.`,
        RETURN_RECEIVED: `[📬 Package Received] We received your return #${payload.returnRequestId}. Processing refund soon.`,
        RETURN_REFUNDED: `[💰 Refunded] Return #${payload.returnRequestId}: ${payload.refundAmount?.toLocaleString()} VND refunded via ${payload.refundMethod}.`,
    };

    const body = templates[event];

    // Structured log (stdout) — replace with real email service below
    console.log(
        JSON.stringify({
            type: 'NOTIFICATION',
            event,
            to: payload.customerEmail ?? 'unknown',
            customerName: payload.customerName,
            returnRequestId: payload.returnRequestId,
            orderId: payload.orderId,
            message: body,
            timestamp: new Date().toISOString(),
        }),
    );

    /*
     * Real email example (nodemailer — already installed):
     *
     * import transporter from './mailer';
     * await transporter.sendMail({
     *   from: '"AISTHEA" <no-reply@aisthea.com>',
     *   to: payload.customerEmail,
     *   subject: `[AISTHEA] ${event.replace(/_/g, ' ')}`,
     *   text: body,
     * });
     */
}
