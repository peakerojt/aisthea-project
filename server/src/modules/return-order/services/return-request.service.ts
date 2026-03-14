import { Prisma } from '../../../generated/client';
import { prisma } from '../../../utils/prisma';
import { ReturnRequestRepository } from '../repositories/return-request.repository';
import { CreateReturnRequestDto } from '../validators/return-request.validator';
import { notifyCustomer } from '../../../utils/notification.util';

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 7);

type ReturnRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';
type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET_CREDIT';

export class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'ServiceError';
  }
}

/** Valid state machine transitions */
const TRANSITIONS: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  REJECTED: [],
  RECEIVED: ['REFUNDED'],
  REFUNDED: [],
};

export class ReturnRequestService {
  private readonly repo = new ReturnRequestRepository();

  private assertTransition(current: string, next: ReturnRequestStatus): void {
    const allowed = TRANSITIONS[current as ReturnRequestStatus] ?? [];
    if (!allowed.includes(next)) {
      throw new ServiceError(
        'INVALID_STATE_TRANSITION',
        `Cannot transition from ${current} to ${next}`,
        400,
      );
    }
  }

  private returnDeadline(deliveredAt: Date): Date {
    return new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }

  // ─── Customer: Create ──────────────────────────────────────────────────────

  async createReturnRequest(userId: number, payload: CreateReturnRequestDto) {
    const order: any = await this.repo.findOrderForReturn(payload.orderId);
    if (!order) throw new ServiceError('ORDER_NOT_FOUND', 'Order not found', 404);
    if (order.userId !== userId)
      throw new ServiceError('FORBIDDEN', 'No permission to access this order', 403);
    // DB lưu status tiếng Việt ("Đã giao") hoặc tiếng Anh ("DELIVERED")
    const orderStatusLower = (order.status ?? '').toLowerCase().trim();
    const isDelivered = orderStatusLower === 'delivered' || orderStatusLower === 'đã giao' || orderStatusLower === 'da giao';
    if (!isDelivered)
      throw new ServiceError('ORDER_NOT_DELIVERED', 'Only DELIVERED orders can be returned', 400);

    // Tìm ngày giao hàng: status có thể là "Đã giao", "DELIVERED", "Da Giao"...
    const DELIVERED_STATUSES = ['delivered', 'đã giao', 'da giao', 'dagiao'];
    const deliveredHistory = order.statusHistory?.find((h: any) =>
      DELIVERED_STATUSES.includes((h.status ?? '').toLowerCase().trim())
    );
    // Fallback: dùng createdAt nếu không có history (đối với test data)
    const deliveredAt: Date = deliveredHistory?.changedAt ?? order.createdAt ?? new Date();

    if (new Date() > this.returnDeadline(deliveredAt))
      throw new ServiceError(
        'RETURN_WINDOW_EXPIRED',
        `Return window expired (${RETURN_WINDOW_DAYS} days since delivery)`,
        400,
      );

    const itemMap = new Map<number, any>(
      (order.items as any[]).map((i: any) => [i.orderItemId, i]),
    );

    const result = await prisma.$transaction(async (tx: any) => {
      // Calculate already-returned quantities to enforce partial-return limits
      let alreadyReturned: Record<number, number> = {};
      try {
        alreadyReturned = await this.repo.getAlreadyReturnedQtyByOrderItem(
          payload.items.map((i) => i.orderItemId),
          tx,
        );
      } catch {
        alreadyReturned = {};
      }

      let totalRefundAmount = new Prisma.Decimal(0);
      const returnItems: any[] = [];

      for (const item of payload.items) {
        const orderItem: any = itemMap.get(item.orderItemId);
        if (!orderItem)
          throw new ServiceError(
            'ORDER_ITEM_NOT_FOUND',
            `Order item #${item.orderItemId} does not belong to this order`,
            400,
          );

        const returnedQty = alreadyReturned[item.orderItemId] ?? 0;
        const maxQty = orderItem.quantity - returnedQty;
        if (maxQty <= 0 || item.quantity > maxQty)
          throw new ServiceError(
            'INVALID_RETURN_QUANTITY',
            `Return quantity exceeds allowed limit for item #${item.orderItemId} (max ${maxQty})`,
            400,
          );

        totalRefundAmount = totalRefundAmount.plus(
          new Prisma.Decimal(orderItem.unitPrice).mul(item.quantity),
        );

        returnItems.push({
          orderItem: { connect: { orderItemId: orderItem.orderItemId } },
          quantity: item.quantity,
          unitPrice: orderItem.unitPrice,
          reason: item.reason ?? payload.reason,
        });
      }

      return this.repo.createReturnRequest(
        {
          order: { connect: { orderId: order.orderId } },
          user: { connect: { userId } },
          reason: payload.reason,
          note: payload.note,
          deliveredAt,
          totalRefundAmount,
          status: 'REQUESTED',
          items: { create: returnItems },
          attachments: payload.attachments?.length
            ? { create: payload.attachments.map((fileUrl) => ({ fileUrl })) }
            : undefined,
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: 'REQUESTED',
              changedBy: userId,
              comment: 'Customer created return request',
            },
          },
        },
        tx,
      );
    });

    // Mock notification
    notifyCustomer('RETURN_REQUESTED', {
      returnRequestId: result.returnRequestId,
      orderId: result.orderId,
    });

    return result;
  }

  // ─── Admin: Approve ────────────────────────────────────────────────────────

  async approveReturnRequest(id: number, actorId: number) {
    const result = await this.transitionStatus(id, actorId, 'APPROVED', 'Approved by support/admin');
    notifyCustomer('RETURN_APPROVED', { returnRequestId: id, orderId: result.orderId });
    return result;
  }

  // ─── Admin: Reject ─────────────────────────────────────────────────────────

  async rejectReturnRequest(id: number, actorId: number, reason: string) {
    const result = await this.transitionStatus(id, actorId, 'REJECTED', reason);
    notifyCustomer('RETURN_REJECTED', {
      returnRequestId: id,
      orderId: result.orderId,
      comment: reason,
    });
    return result;
  }

  // ─── Admin: Mark Received ──────────────────────────────────────────────────

  async markReturnReceived(id: number, actorId: number) {
    const result = await this.transitionStatus(
      id,
      actorId,
      'RECEIVED',
      'Warehouse confirmed return package received',
    );
    notifyCustomer('RETURN_RECEIVED', { returnRequestId: id, orderId: result.orderId });
    return result;
  }

  // ─── Admin: Refund ─────────────────────────────────────────────────────────

  async refundReturnRequest(
    id: number,
    actorId: number,
    params: { method: RefundMethod; amount?: number; idempotencyKey: string },
  ) {
    const refund = await prisma.$transaction(async (tx: any) => {
      // Idempotency guard — return existing record if same key
      const existing = await tx.refundTransaction.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) return existing;

      const request = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
      });
      if (!request)
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);

      this.assertTransition(request.status, 'REFUNDED');

      const amount = new Prisma.Decimal(params.amount ?? request.totalRefundAmount.toNumber());
      if (amount.lte(0) || amount.gt(request.totalRefundAmount))
        throw new ServiceError('INVALID_REFUND_AMOUNT', 'Invalid refund amount (exceeds allowed limit)');

      const refundRecord = await tx.refundTransaction.create({
        data: {
          returnRequestId: id,
          amount,
          method: params.method,
          status: 'COMPLETED',
          idempotencyKey: params.idempotencyKey,
          transactionRef: `RF-${id}-${Date.now()}`,
          processedBy: actorId,
        },
      });

      await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: { status: 'REFUNDED' },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: 'REFUNDED',
          changedBy: actorId,
          comment: `Refunded via ${params.method} — txn ${refundRecord.transactionRef}`,
        },
      });

      return refundRecord;
    });

    const request = await this.repo.findById(id);
    notifyCustomer('RETURN_REFUNDED', {
      returnRequestId: id,
      orderId: request?.orderId ?? 0,
      refundAmount: Number(refund.amount),
      refundMethod: refund.method,
    });

    return refund;
  }

  // ─── Shared: status transition ─────────────────────────────────────────────

  private async transitionStatus(
    id: number,
    actorId: number,
    nextStatus: ReturnRequestStatus,
    comment: string,
  ) {
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
      });
      if (!current)
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);

      this.assertTransition(current.status, nextStatus);

      const updated = await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: { status: nextStatus, updatedAt: new Date() },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: current.status,
          toStatus: nextStatus,
          changedBy: actorId,
          comment,
        },
      });

      return updated;
    });
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getMyReturns(userId: number, page: number, limit: number) {
    return this.repo.findByUser(userId, page, limit);
  }

  getReturnDetail(id: number) {
    return this.repo.findById(id);
  }

  getAdminReturns(filters: Parameters<ReturnRequestRepository['findAllAdmin']>[0]) {
    return this.repo.findAllAdmin(filters);
  }
}
