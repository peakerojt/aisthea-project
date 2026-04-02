import { isSettledPaymentStatus } from '../../config/paymentStatus.config';

type MoneyLike = { toString(): string } | string | number | null | undefined;

type CodPaymentRecord = {
  paymentId: number;
  status?: string | null;
} | null;

type LockedReturnRequestRecord = {
  returnRequestId: number;
};

export interface CodReturnReconciliationTx {
  payment: {
    findFirst: (args: unknown) => Promise<CodPaymentRecord>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  returnRequest: {
    findMany: (args: unknown) => Promise<LockedReturnRequestRecord[]>;
    updateMany: (args: unknown) => Promise<unknown>;
  };
  returnRequestStatusLog: {
    createMany: (args: unknown) => Promise<unknown>;
  };
}

export const COD_RETURN_UNLOCK_COMMENT =
  'COD payment confirmed. Return request moved to admin review.';

const isCodPaymentMethod = (paymentMethod?: string | null) =>
  (paymentMethod ?? '').trim().toUpperCase() === 'COD';

const toAmountNumber = (value: MoneyLike) =>
  Number(value?.toString?.() ?? value ?? 0);

export async function reconcileCodReturnUnlockAfterDeliveryConfirmation(
  tx: CodReturnReconciliationTx,
  params: {
    orderId: number;
    paymentMethod?: string | null;
    totalAmount?: MoneyLike;
    actorId?: number | null;
    paymentNote: string;
    statusLogComment?: string;
    occurredAt?: Date;
  },
) {
  if (!isCodPaymentMethod(params.paymentMethod)) {
    return {
      paymentAction: 'skipped' as const,
      unlockedReturnIds: [] as number[],
    };
  }

  const latestCodPayment = await tx.payment.findFirst({
    where: { orderId: params.orderId, paymentMethod: 'COD' },
    orderBy: { paymentId: 'desc' },
  });

  let paymentAction: 'unchanged' | 'updated' | 'created' = 'unchanged';

  if (!isSettledPaymentStatus(latestCodPayment?.status) && latestCodPayment) {
    await tx.payment.update({
      where: { paymentId: latestCodPayment.paymentId },
      data: {
        status: 'COMPLETED',
        paymentDate: new Date(),
        note: params.paymentNote,
      },
    });
    paymentAction = 'updated';
  }

  if (!isSettledPaymentStatus(latestCodPayment?.status) && !latestCodPayment) {
    await tx.payment.create({
      data: {
        orderId: params.orderId,
        paymentMethod: 'COD',
        amount: toAmountNumber(params.totalAmount),
        status: 'COMPLETED',
        paymentDate: new Date(),
        note: params.paymentNote,
      },
    });
    paymentAction = 'created';
  }

  const lockedReturnRequests = await tx.returnRequest.findMany({
    where: {
      orderId: params.orderId,
      status: 'PENDING_PAYMENT_CONFIRMATION',
    },
    select: {
      returnRequestId: true,
    },
  });

  if (lockedReturnRequests.length === 0) {
    return {
      paymentAction,
      unlockedReturnIds: [] as number[],
    };
  }

  const eventTime = params.occurredAt ?? new Date();
  const unlockedReturnIds = lockedReturnRequests.map((request) => request.returnRequestId);

  await tx.returnRequest.updateMany({
    where: {
      returnRequestId: { in: unlockedReturnIds },
    },
    data: {
      status: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'NOT_APPLICABLE',
      updatedAt: eventTime,
    },
  });

  await tx.returnRequestStatusLog.createMany({
    data: unlockedReturnIds.map((returnRequestId) => ({
      returnRequestId,
      fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
      toStatus: 'PENDING_ADMIN_REVIEW',
      changedBy: params.actorId ?? null,
      comment: params.statusLogComment ?? COD_RETURN_UNLOCK_COMMENT,
      createdAt: eventTime,
    })),
  });

  return {
    paymentAction,
    unlockedReturnIds,
  };
}
