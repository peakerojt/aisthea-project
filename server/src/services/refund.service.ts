import { prisma } from '../utils/prisma';
import { deriveOrderPaymentStatus } from '../shared/order-state';

export class RefundError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status = 400, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface GatewayRefundResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
}

export interface IPaymentGateway {
  processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult>;
}

export class MockVNPayGateway implements IPaymentGateway {
  async processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    if (Math.random() < 0.1) {
      return {
        success: false,
        errorMessage: 'VNPay: Refund transaction failed - Error code GW_TIMEOUT',
      };
    }

    return { success: true, transactionId: `VNP-RF-${paymentId}-${Date.now()}` };
  }
}

export class MockStripeGateway implements IPaymentGateway {
  async processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 250));

    if (Math.random() < 0.1) {
      return {
        success: false,
        errorMessage: 'Stripe: charge_already_refunded or card_error',
      };
    }

    return { success: true, transactionId: `re_${paymentId}_${Math.random().toString(36).slice(2, 12)}` };
  }
}

function selectGateway(method: string): IPaymentGateway {
  if (method === 'BANK_TRANSFER' || method === 'STORE_WALLET') {
    return {
      async processRefund() {
        return { success: true, transactionId: `MANUAL-${Date.now()}` };
      },
    };
  }

  return new MockVNPayGateway();
}

export interface CreateRefundPayload {
  amount: number;
  type: 'FULL' | 'PARTIAL';
  method: 'ORIGINAL_GATEWAY' | 'BANK_TRANSFER' | 'STORE_WALLET';
  reason: string;
}

export async function initiateRefund(
  orderId: number,
  adminUserId: number,
  payload: CreateRefundPayload,
): Promise<any> {
  const order = await (prisma.order.findUnique as any)({
    where: { orderId },
    include: {
      payments: true,
      refunds: true,
    },
  });

  if (!order) {
    throw new RefundError('ORDER_NOT_FOUND', 404);
  }

  const orderPaymentStatus = deriveOrderPaymentStatus(order.payments);
  const isPaid = orderPaymentStatus === 'PAID';
  const isPartiallyRefunded = orderPaymentStatus === 'PARTIALLY_REFUNDED';

  if (!isPaid && !isPartiallyRefunded) {
    throw new RefundError('ORDER_NOT_PAID');
  }

  const orderTotal = Number(order.totalAmount);
  const totalAlreadyRefunded = (order.refunds as any[])
    .filter((refund: any) => refund.status === 'SUCCESS')
    .reduce((sum: number, refund: any) => sum + Number(refund.amount), 0);

  if (payload.amount <= 0) {
    throw new RefundError('INVALID_AMOUNT');
  }

  if (totalAlreadyRefunded + payload.amount > orderTotal) {
    throw new RefundError('OVER_REFUND');
  }

  const originalPayment = (order.payments as any[])[0] ?? null;
  const gatewayPaymentRef = originalPayment?.transactionCode ?? String(originalPayment?.paymentId ?? orderId);
  const gateway = selectGateway(payload.method);

  return prisma.$transaction(async (tx) => {
    const refund = await (tx.refund.create as any)({
      data: {
        orderId,
        paymentId: originalPayment?.paymentId ?? null,
        amount: payload.amount,
        type: payload.type,
        method: payload.method,
        status: 'PROCESSING',
        reason: payload.reason,
        createdBy: adminUserId,
      },
    });

    const gatewayResult = await gateway.processRefund(gatewayPaymentRef, payload.amount);

    if (!gatewayResult.success) {
      await (tx.refund.update as any)({
        where: { refundId: refund.refundId },
        data: {
          status: 'FAILED',
          gatewayError: gatewayResult.errorMessage ?? 'Unknown gateway error.',
        },
      });

      throw new RefundError('GATEWAY_FAILED');
    }

    await (tx.refund.update as any)({
      where: { refundId: refund.refundId },
      data: {
        status: 'SUCCESS',
        gatewayTransactionId: gatewayResult.transactionId,
      },
    });

    const newTotalRefunded = totalAlreadyRefunded + payload.amount;
    const isFullyRefunded = newTotalRefunded >= orderTotal;

    if (originalPayment) {
      await (tx.payment.update as any)({
        where: { paymentId: originalPayment.paymentId },
        data: {
          status: isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
    }

    return { ...refund, status: 'SUCCESS', gatewayTransactionId: gatewayResult.transactionId };
  });
}

export async function getRefundsForOrder(orderId: number): Promise<any[]> {
  return (prisma.refund.findMany as any)({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
}
