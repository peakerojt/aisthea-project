import { AUTH_EMAIL_EVENT_TYPE, ORDER_EMAIL_EVENT_TYPE, REFUND_EMAIL_EVENT_TYPE } from './email.types';
import { emailJobRepository, type EmailJobClient } from './email-job.repository';

const createEphemeralEventKey = (prefix: string, entityId: number) =>
  `${prefix}:${entityId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

export const notificationService = {
  enqueueVerificationEmail(
    input: { userId: number; email: string; fullName: string; code: string },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: `verify-email:${input.userId}:${input.code}`,
        eventType: AUTH_EMAIL_EVENT_TYPE.VERIFICATION,
        recipient: input.email,
        payloadJson: JSON.stringify({
          userId: input.userId,
          fullName: input.fullName,
          code: input.code,
        }),
      },
      client,
    );
  },

  enqueuePasswordResetEmail(
    input: { userId: number; email: string; fullName: string; code: string },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: `reset-password:${input.userId}:${input.code}`,
        eventType: AUTH_EMAIL_EVENT_TYPE.PASSWORD_RESET,
        recipient: input.email,
        payloadJson: JSON.stringify({
          userId: input.userId,
          fullName: input.fullName,
          code: input.code,
        }),
      },
      client,
    );
  },

  enqueueOrderPlacedEmail(
    input: {
      orderId: number;
      orderNumber: string;
      email: string;
      customerName: string;
      totalAmount: number;
      paymentMethod: string | null;
      createdAt: string | null;
      orderUrl: string;
    },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: `order-placed:${input.orderId}`,
        eventType: ORDER_EMAIL_EVENT_TYPE.ORDER_PLACED,
        recipient: input.email,
        payloadJson: JSON.stringify({
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          totalAmount: input.totalAmount,
          paymentMethod: input.paymentMethod,
          createdAt: input.createdAt,
          orderUrl: input.orderUrl,
        }),
      },
      client,
    );
  },

  enqueueOrderStatusEmail(
    input: {
      orderId: number;
      orderNumber: string;
      email: string;
      customerName: string;
      status: string;
      previousStatus: string | null;
      note: string | null;
      trackingUrl: string;
      historyTimestamp: string;
    },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: `order-status:${input.orderId}:${input.status}:${input.historyTimestamp}`,
        eventType: ORDER_EMAIL_EVENT_TYPE.ORDER_STATUS_UPDATED,
        recipient: input.email,
        payloadJson: JSON.stringify({
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          customerName: input.customerName,
          status: input.status,
          previousStatus: input.previousStatus,
          note: input.note,
          trackingUrl: input.trackingUrl,
        }),
      },
      client,
    );
  },

  enqueueRefundAcceptedBankInfoRequiredEmail(
    input: {
      returnRequestId: number;
      email: string;
      customerName: string;
      orderNumber: string;
      profileBankLink: string;
    },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: createEphemeralEventKey(
          'refund-accepted-bank-info-required',
          input.returnRequestId,
        ),
        eventType: REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_BANK_INFO_REQUIRED,
        recipient: input.email,
        payloadJson: JSON.stringify({
          returnRequestId: input.returnRequestId,
          customerName: input.customerName,
          orderNumber: input.orderNumber,
          profileBankLink: input.profileBankLink,
        }),
      },
      client,
    );
  },

  enqueueRefundAcceptedAwaitingPayoutEmail(
    input: {
      returnRequestId: number;
      email: string;
      customerName: string;
      orderNumber: string;
    },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: createEphemeralEventKey('refund-accepted-awaiting-payout', input.returnRequestId),
        eventType: REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_AWAITING_PAYOUT,
        recipient: input.email,
        payloadJson: JSON.stringify({
          returnRequestId: input.returnRequestId,
          customerName: input.customerName,
          orderNumber: input.orderNumber,
        }),
      },
      client,
    );
  },

  enqueueRefundCompletedBenefitIssuedEmail(
    input: {
      returnRequestId: number;
      email: string;
      customerName: string;
      orderNumber: string;
      refundAmount: number;
      refundDate: string;
      voucherSummary: string | null;
      profileLink: string;
    },
    client?: EmailJobClient,
  ) {
    return emailJobRepository.enqueue(
      {
        eventKey: `refund-completed-benefit-issued:${input.returnRequestId}`,
        eventType: REFUND_EMAIL_EVENT_TYPE.REFUND_COMPLETED_BENEFIT_ISSUED,
        recipient: input.email,
        payloadJson: JSON.stringify({
          returnRequestId: input.returnRequestId,
          customerName: input.customerName,
          orderNumber: input.orderNumber,
          refundAmount: input.refundAmount,
          refundDate: input.refundDate,
          voucherSummary: input.voucherSummary,
          profileLink: input.profileLink,
        }),
      },
      client,
    );
  },
};
