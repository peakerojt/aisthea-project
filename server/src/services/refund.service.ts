import { prisma } from '../utils/prisma';
import { isSettledPaymentStatus } from '../config/paymentStatus.config';
import { deriveOrderPaymentStatus } from '../shared/order-state';

export class RefundError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: RefundErrorDetail[];

  constructor(code: string, status = 400, message = code, details?: RefundErrorDetail[]) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
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

type RefundMethod = 'ORIGINAL_GATEWAY' | 'BANK_TRANSFER' | 'STORE_WALLET';
const MANUAL_REFUND_METHODS: RefundMethod[] = ['BANK_TRANSFER', 'STORE_WALLET'];

export class MockVNPayGateway implements IPaymentGateway {
  async processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    if (paymentId.includes('SIM_INFLIGHT')) {
      return {
        success: false,
        errorMessage: 'VNPay: Refund request is still in progress - Error code 94',
      };
    }

    if (paymentId.includes('SIM_INELIGIBLE')) {
      return {
        success: false,
        errorMessage: 'VNPay: Refund request is not eligible - Error code 95',
      };
    }

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

function isManualRefundMethod(method: RefundMethod): boolean {
  return MANUAL_REFUND_METHODS.includes(method);
}

function selectGateway(method: RefundMethod): IPaymentGateway {
  if (isManualRefundMethod(method)) {
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
  method: RefundMethod;
  reason: string;
}

export interface RefundErrorDetail {
  field?: string;
  code?: string;
  message?: string;
}

export interface RefundHistorySummary {
  totalCollected: number;
  totalRefunded: number;
  remainingRefundable: number;
}

export interface RefundHistoryResult {
  refunds: any[];
  summary: RefundHistorySummary;
}

function calculateTotalRefunded(refunds: any[]): number {
  return refunds
    .filter((refund: any) => refund.status === 'SUCCESS')
    .reduce((sum: number, refund: any) => sum + Number(refund.amount), 0);
}

function calculateTotalCollected(payments: any[]): number {
  return payments
    .filter((payment: any) => isSettledPaymentStatus(payment?.status))
    .reduce((sum: number, payment: any) => sum + Number(payment?.amount ?? 0), 0);
}

function buildOverRefundDetails(remainingRefundable: number): RefundErrorDetail[] {
  return [
    {
      field: 'amount',
      code: 'MAX_REFUNDABLE_AMOUNT',
      message: String(remainingRefundable),
    },
  ];
}

function normalizeRefundType(amount: number, remainingRefundable: number): 'FULL' | 'PARTIAL' {
  return amount >= remainingRefundable ? 'FULL' : 'PARTIAL';
}

function getLatestCollectedPayment(payments: any[]) {
  return [...payments]
    .filter((payment: any) => isSettledPaymentStatus(payment?.status))
    .sort((left: any, right: any) => Number(right?.paymentId ?? 0) - Number(left?.paymentId ?? 0))[0] ?? null;
}

function hasProcessingRefund(refunds: any[]): boolean {
  return refunds.some((refund: any) => refund.status === 'PROCESSING');
}

function classifyGatewayFailure(errorMessage?: string): {
  refundStatus: 'FAILED' | 'PROCESSING';
  errorCode: 'GATEWAY_FAILED' | 'REFUND_IN_PROGRESS' | 'REFUND_NOT_ELIGIBLE';
} {
  const normalized = (errorMessage ?? '').toUpperCase();

  if (normalized.includes('94') || normalized.includes('05') || normalized.includes('06')) {
    return {
      refundStatus: 'PROCESSING',
      errorCode: 'REFUND_IN_PROGRESS',
    };
  }

  if (normalized.includes('95')) {
    return {
      refundStatus: 'FAILED',
      errorCode: 'REFUND_NOT_ELIGIBLE',
    };
  }

  return {
    refundStatus: 'FAILED',
    errorCode: 'GATEWAY_FAILED',
  };
}

function resolveGatewayPaymentRef(originalPayment: any, orderId: number): string {
  return originalPayment?.transactionCode ?? String(originalPayment?.paymentId ?? orderId);
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

  const totalCollected = calculateTotalCollected(order.payments as any[]);
  const totalAlreadyRefunded = calculateTotalRefunded(order.refunds as any[]);
  const remainingRefundable = Math.max(totalCollected - totalAlreadyRefunded, 0);

  if (totalCollected <= 0) {
    throw new RefundError('ORDER_NOT_PAID');
  }

  if (hasProcessingRefund(order.refunds as any[])) {
    throw new RefundError('REFUND_ALREADY_IN_PROGRESS', 409);
  }

  if (payload.amount <= 0) {
    throw new RefundError('INVALID_AMOUNT');
  }

  if (payload.amount > remainingRefundable) {
    throw new RefundError(
      'OVER_REFUND',
      400,
      'OVER_REFUND',
      buildOverRefundDetails(remainingRefundable),
    );
  }

  const originalPayment = getLatestCollectedPayment(order.payments as any[]);
  const gatewayPaymentRef = resolveGatewayPaymentRef(originalPayment, orderId);
  const gateway = selectGateway(payload.method);
  const refundType = normalizeRefundType(payload.amount, remainingRefundable);

  return prisma.$transaction(async (tx) => {
    const refund = await (tx.refund.create as any)({
      data: {
        orderId,
        paymentId: originalPayment?.paymentId ?? null,
        amount: payload.amount,
        type: refundType,
        method: payload.method,
        status: 'PROCESSING',
        reason: payload.reason,
        createdBy: adminUserId,
      },
    });

    const gatewayResult = await gateway.processRefund(gatewayPaymentRef, payload.amount);

    if (!gatewayResult.success) {
      const failure = classifyGatewayFailure(gatewayResult.errorMessage);

      await (tx.refund.update as any)({
        where: { refundId: refund.refundId },
        data: {
          status: failure.refundStatus,
          gatewayError: gatewayResult.errorMessage ?? 'Unknown gateway error.',
        },
      });

      throw new RefundError(
        failure.errorCode,
        failure.errorCode === 'REFUND_IN_PROGRESS' ? 409 : 400,
      );
    }

    await (tx.refund.update as any)({
      where: { refundId: refund.refundId },
      data: {
        status: 'SUCCESS',
        gatewayTransactionId: gatewayResult.transactionId,
      },
    });

    const newTotalRefunded = totalAlreadyRefunded + payload.amount;
    const isFullyRefunded = newTotalRefunded >= totalCollected;

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

export async function getRefundsForOrder(orderId: number): Promise<RefundHistoryResult> {
  const [refunds, order] = await Promise.all([
    (prisma.refund.findMany as any)({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    }),
    (prisma.order.findUnique as any)({
      where: { orderId },
      include: {
        payments: true,
      },
    }),
  ]);

  const totalCollected = calculateTotalCollected(order?.payments ?? []);
  const totalRefunded = calculateTotalRefunded(refunds);

  return {
    refunds,
    summary: {
      totalCollected,
      totalRefunded,
      remainingRefundable: Math.max(totalCollected - totalRefunded, 0),
    },
  };
}
