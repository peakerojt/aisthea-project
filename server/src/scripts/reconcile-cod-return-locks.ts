import { prisma } from '../utils/prisma';
import { normalizeOrderStatus } from '../shared/order-state';
import { reconcileCodReturnUnlockAfterDeliveryConfirmation } from '../modules/order/cod-return-reconciliation';

export interface CodReturnLockReconciliationReport {
  apply: boolean;
  scannedLockedReturns: number;
  candidateOrders: number;
  reconciledOrders: number;
  unlockedReturns: number;
  skippedNonCodOrders: number;
  skippedUndeliveredOrders: number;
  orderSummaries: Array<{
    orderId: number;
    orderNumber: string;
    lockedReturnIds: number[];
    applied: boolean;
    unlockedReturnIds: number[];
    paymentAction: 'skipped' | 'unchanged' | 'updated' | 'created';
  }>;
}

type LockedReturnWithOrder = {
  returnRequestId: number;
  orderId: number;
  order: {
    orderId: number;
    orderNumber: string;
    status: string | null;
    paymentMethod: string | null;
    totalAmount: { toString(): string } | string | number | null;
  };
};

const BACKFILL_PAYMENT_NOTE =
  'Backfill repair: COD payment marked as collected after delivered-order reconciliation.';

const BACKFILL_STATUS_LOG_COMMENT =
  'Backfill repair: COD payment confirmed. Return request moved to admin review.';

const isCodPaymentMethod = (paymentMethod?: string | null) =>
  (paymentMethod ?? '').trim().toUpperCase() === 'COD';

const isDeliveredOrderStatus = (status?: string | null) =>
  normalizeOrderStatus(status) === 'delivered';

export const collectCodReturnLockCandidates = (
  lockedReturns: LockedReturnWithOrder[],
) => {
  const candidates = new Map<number, {
    orderId: number;
    orderNumber: string;
    paymentMethod: string | null;
    orderStatus: string | null;
    totalAmount: { toString(): string } | string | number | null;
    lockedReturnIds: number[];
  }>();

  let skippedNonCodOrders = 0;
  let skippedUndeliveredOrders = 0;

  for (const lockedReturn of lockedReturns) {
    const paymentMethod = lockedReturn.order?.paymentMethod ?? null;
    const orderStatus = lockedReturn.order?.status ?? null;

    if (!isCodPaymentMethod(paymentMethod)) {
      skippedNonCodOrders += 1;
      continue;
    }

    if (!isDeliveredOrderStatus(orderStatus)) {
      skippedUndeliveredOrders += 1;
      continue;
    }

    const existing = candidates.get(lockedReturn.orderId);
    if (existing) {
      existing.lockedReturnIds.push(lockedReturn.returnRequestId);
      continue;
    }

    candidates.set(lockedReturn.orderId, {
      orderId: lockedReturn.orderId,
      orderNumber: lockedReturn.order?.orderNumber ?? `ORD-${lockedReturn.orderId}`,
      paymentMethod,
      orderStatus,
      totalAmount: lockedReturn.order?.totalAmount ?? 0,
      lockedReturnIds: [lockedReturn.returnRequestId],
    });
  }

  return {
    candidates: [...candidates.values()],
    skippedNonCodOrders,
    skippedUndeliveredOrders,
  };
};

export async function runCodReturnLockReconciliation({
  apply = false,
  prismaClient = prisma,
  log = console,
}: {
  apply?: boolean;
  prismaClient?: typeof prisma;
  log?: Pick<Console, 'info' | 'error'>;
} = {}): Promise<CodReturnLockReconciliationReport> {
  const lockedReturns = await prismaClient.returnRequest.findMany({
    where: {
      status: 'PENDING_PAYMENT_CONFIRMATION',
    },
    select: {
      returnRequestId: true,
      orderId: true,
      order: {
        select: {
          orderId: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          totalAmount: true,
        },
      },
    },
  }) as LockedReturnWithOrder[];

  const {
    candidates,
    skippedNonCodOrders,
    skippedUndeliveredOrders,
  } = collectCodReturnLockCandidates(lockedReturns);

  const orderSummaries: CodReturnLockReconciliationReport['orderSummaries'] = [];
  let reconciledOrders = 0;
  let unlockedReturns = 0;

  for (const candidate of candidates) {
    if (!apply) {
      orderSummaries.push({
        orderId: candidate.orderId,
        orderNumber: candidate.orderNumber,
        lockedReturnIds: candidate.lockedReturnIds,
        applied: false,
        unlockedReturnIds: [],
        paymentAction: 'skipped',
      });
      continue;
    }

    const result = await prismaClient.$transaction((tx) =>
      reconcileCodReturnUnlockAfterDeliveryConfirmation(tx as any, {
        orderId: candidate.orderId,
        paymentMethod: candidate.paymentMethod,
        totalAmount: candidate.totalAmount,
        actorId: null,
        paymentNote: BACKFILL_PAYMENT_NOTE,
        statusLogComment: BACKFILL_STATUS_LOG_COMMENT,
      }),
    );

    reconciledOrders += 1;
    unlockedReturns += result.unlockedReturnIds.length;
    orderSummaries.push({
      orderId: candidate.orderId,
      orderNumber: candidate.orderNumber,
      lockedReturnIds: candidate.lockedReturnIds,
      applied: true,
      unlockedReturnIds: result.unlockedReturnIds,
      paymentAction: result.paymentAction,
    });
  }

  const report: CodReturnLockReconciliationReport = {
    apply,
    scannedLockedReturns: lockedReturns.length,
    candidateOrders: candidates.length,
    reconciledOrders,
    unlockedReturns,
    skippedNonCodOrders,
    skippedUndeliveredOrders,
    orderSummaries,
  };

  log.info(
    `[repair:cod-return-locks] scanned=${report.scannedLockedReturns} candidates=${report.candidateOrders} apply=${report.apply}`,
  );

  if (apply) {
    log.info(
      `[repair:cod-return-locks] reconciledOrders=${report.reconciledOrders} unlockedReturns=${report.unlockedReturns}`,
    );
  }

  return report;
}

const main = async () => {
  const apply = process.argv.includes('--apply');
  const report = await runCodReturnLockReconciliation({ apply });
  console.info(JSON.stringify(report, null, 2));
};

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
