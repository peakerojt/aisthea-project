import { ORDER_STATUS } from '../../config/orderStatus.config';
import { isSettledPaymentStatus } from '../../config/paymentStatus.config';
import { logger } from '../../lib/logger';
import { atomicCancelRestore } from '../../services/inventory.service';
import { prisma } from '../../utils/prisma';

const DEFAULT_VNPAY_PENDING_ORDER_TTL_MS = 15 * 60_000;
const DEFAULT_VNPAY_PENDING_ORDER_SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_VNPAY_PENDING_ORDER_BATCH_LIMIT = 20;
const AUTO_CANCELABLE_VNPAY_PAYMENT_STATUSES = new Set(['PENDING', 'FAILED', 'CANCELLED']);
const AUTO_CANCEL_NOTE =
  'Đơn VNPay chưa được thanh toán trong thời gian cho phép. Hệ thống đã tự động hủy đơn và hoàn lại tồn kho.';
const AUTO_CANCEL_PAYMENT_NOTE =
  'VNPay payment window expired. Order auto-cancelled and stock released.';

let activeRun: Promise<{
  inspectedCount: number;
  expiredCount: number;
  restoredItemCount: number;
  cutoff: string;
}> | null = null;
let stopRequested = false;

const normalizePaymentStatus = (status: string | null | undefined) =>
  (status ?? '').trim().toUpperCase();

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const expireUnpaidVnpayOrders = async (options?: {
  now?: Date;
  ttlMs?: number;
  limit?: number;
}) => {
  if (activeRun) {
    return activeRun;
  }

  activeRun = (async () => {
    const now = options?.now ?? new Date();
    const ttlMs = options?.ttlMs ?? DEFAULT_VNPAY_PENDING_ORDER_TTL_MS;
    const limit = options?.limit ?? DEFAULT_VNPAY_PENDING_ORDER_BATCH_LIMIT;
    const cutoff = new Date(now.getTime() - ttlMs);

    const candidates = await prisma.order.findMany({
      where: {
        paymentMethod: 'VNPAY',
        status: ORDER_STATUS.PENDING,
        createdAt: { lte: cutoff },
        payments: {
          some: { paymentMethod: 'VNPAY' },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { orderId: 'asc' }],
      take: limit,
      select: {
        orderId: true,
        orderNumber: true,
        createdAt: true,
        payments: {
          where: { paymentMethod: 'VNPAY' },
          orderBy: [{ paymentDate: 'desc' }, { paymentId: 'desc' }],
          take: 1,
          select: {
            paymentId: true,
            status: true,
            paymentDate: true,
          },
        },
      },
    });

    let expiredCount = 0;
    let restoredItemCount = 0;

    for (const candidate of candidates) {
      if (stopRequested) {
        break;
      }

      const latestPayment = candidate.payments[0] ?? null;
      const latestPaymentStatus = normalizePaymentStatus(latestPayment?.status);
      const latestPaymentAt = latestPayment?.paymentDate ?? candidate.createdAt ?? now;

      if (
        !latestPayment
        || isSettledPaymentStatus(latestPaymentStatus)
        || !AUTO_CANCELABLE_VNPAY_PAYMENT_STATUSES.has(latestPaymentStatus)
        || latestPaymentAt > cutoff
      ) {
        continue;
      }

      const expiredOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { orderId: candidate.orderId },
          select: {
            orderId: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            items: {
              select: {
                variantId: true,
                quantity: true,
              },
            },
            payments: {
              where: { paymentMethod: 'VNPAY' },
              orderBy: [{ paymentDate: 'desc' }, { paymentId: 'desc' }],
              take: 1,
              select: {
                paymentId: true,
                status: true,
                paymentDate: true,
              },
            },
          },
        });

        if (!order || order.status !== ORDER_STATUS.PENDING) {
          return null;
        }

        const livePayment = order.payments[0] ?? null;
        const livePaymentStatus = normalizePaymentStatus(livePayment?.status);
        const livePaymentAt = livePayment?.paymentDate ?? order.createdAt ?? now;

        if (
          !livePayment
          || isSettledPaymentStatus(livePaymentStatus)
          || !AUTO_CANCELABLE_VNPAY_PAYMENT_STATUSES.has(livePaymentStatus)
          || livePaymentAt > cutoff
        ) {
          return null;
        }

        const guardedOrderUpdate = await tx.order.updateMany({
          where: {
            orderId: order.orderId,
            status: ORDER_STATUS.PENDING,
          },
          data: {
            status: ORDER_STATUS.CANCELLED,
            note: AUTO_CANCEL_NOTE,
          },
        });

        if (guardedOrderUpdate.count !== 1) {
          return null;
        }

        if (livePaymentStatus === 'PENDING') {
          await tx.payment.update({
            where: { paymentId: livePayment.paymentId },
            data: {
              status: 'CANCELLED',
              note: AUTO_CANCEL_PAYMENT_NOTE,
            },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.orderId,
            oldStatus: order.status,
            status: ORDER_STATUS.CANCELLED,
            changedBy: null,
            changedAt: now,
            note: AUTO_CANCEL_NOTE,
          },
        });

        await atomicCancelRestore(
          order.orderId,
          null,
          order.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          tx as any,
          { restoreType: 'cancel' },
        );

        return {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          restoredItemCount: order.items.length,
        };
      });

      if (!expiredOrder) {
        continue;
      }

      expiredCount += 1;
      restoredItemCount += expiredOrder.restoredItemCount;

      logger.warn('[vnpayExpirationWorker] Auto-cancelled unpaid VNPay order', {
        orderId: expiredOrder.orderId,
        orderNumber: expiredOrder.orderNumber,
        cutoff: cutoff.toISOString(),
      });
    }

    if (candidates.length > 0 || expiredCount > 0) {
      logger.info('[vnpayExpirationWorker] Sweep summary', {
        inspectedCount: candidates.length,
        expiredCount,
        restoredItemCount,
        cutoff: cutoff.toISOString(),
      });
    }

    return {
      inspectedCount: candidates.length,
      expiredCount,
      restoredItemCount,
      cutoff: cutoff.toISOString(),
    };
  })();

  try {
    return await activeRun;
  } finally {
    activeRun = null;
  }
};

export const startExpiredVnpayOrderWorker = (options?: {
  intervalMs?: number;
  ttlMs?: number;
  limit?: number;
}) => {
  if (process.env.NODE_ENV === 'test') {
    return async () => undefined;
  }

  const intervalMs = options?.intervalMs ?? parsePositiveInteger(
    process.env.VNPAY_PENDING_ORDER_SWEEP_INTERVAL_MS,
    DEFAULT_VNPAY_PENDING_ORDER_SWEEP_INTERVAL_MS,
  );
  const ttlMs = options?.ttlMs ?? parsePositiveInteger(
    process.env.VNPAY_PENDING_ORDER_TTL_MS,
    DEFAULT_VNPAY_PENDING_ORDER_TTL_MS,
  );
  const limit = options?.limit ?? parsePositiveInteger(
    process.env.VNPAY_PENDING_ORDER_SWEEP_LIMIT,
    DEFAULT_VNPAY_PENDING_ORDER_BATCH_LIMIT,
  );

  stopRequested = false;

  void expireUnpaidVnpayOrders({ ttlMs, limit });

  const timer = setInterval(() => {
    void expireUnpaidVnpayOrders({ ttlMs, limit });
  }, intervalMs);

  timer.unref?.();

  return async () => {
    stopRequested = true;
    clearInterval(timer);

    if (activeRun) {
      await activeRun;
    }
  };
};
