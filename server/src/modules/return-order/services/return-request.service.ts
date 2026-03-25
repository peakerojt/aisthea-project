import { Prisma } from '../../../generated/client';
import { prisma } from '../../../utils/prisma';
import { ReturnRequestRepository } from '../repositories/return-request.repository';
import { CreateReturnRequestDto } from '../validators/return-request.validator';
import { notifyCustomer } from '../../../utils/notification.util';
import { buildLegacyCreateReturnDraft } from '../../../shared/legacy-return-create.adapter';
import {
  RefundMethod,
  RETURN_REQUEST_TRANSITIONS,
  ReturnRequestStatus,
} from '../return-request.types';

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 7);
const DELIVERED_ORDER_STATUSES = ['delivered', 'đã giao', 'da giao', 'dagiao'] as const;

type ReturnOrder = any;
type ReturnTx = any;

export class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ReturnRequestService {
  private readonly repo = new ReturnRequestRepository();

  private readonly transitionNotifications = {
    APPROVED: 'RETURN_APPROVED',
    REJECTED: 'RETURN_REJECTED',
    RECEIVED: 'RETURN_RECEIVED',
  } as const;

  private normalizeStatus(value: unknown): string {
    return String(value ?? '').toLowerCase().trim();
  }

  private assertTransition(current: string, next: ReturnRequestStatus): void {
    const allowed = RETURN_REQUEST_TRANSITIONS[current as ReturnRequestStatus] ?? [];
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

  private ensureOrderCanBeReturned(order: ReturnOrder | null, userId: number): ReturnOrder {
    if (!order) {
      throw new ServiceError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.userId !== userId) {
      throw new ServiceError('FORBIDDEN', 'No permission to access this order', 403);
    }

    if (!DELIVERED_ORDER_STATUSES.includes(this.normalizeStatus(order.status) as (typeof DELIVERED_ORDER_STATUSES)[number])) {
      throw new ServiceError('ORDER_NOT_DELIVERED', 'Only DELIVERED orders can be returned', 400);
    }

    return order;
  }

  private resolveDeliveredAt(order: ReturnOrder): Date {
    const deliveredHistory = order.statusHistory?.find((history: any) =>
      DELIVERED_ORDER_STATUSES.includes(this.normalizeStatus(history.status) as (typeof DELIVERED_ORDER_STATUSES)[number]),
    );

    return deliveredHistory?.changedAt ?? order.createdAt ?? new Date();
  }

  private assertReturnWindow(deliveredAt: Date): void {
    if (new Date() > this.returnDeadline(deliveredAt)) {
      throw new ServiceError(
        'RETURN_WINDOW_EXPIRED',
        `Return window expired (${RETURN_WINDOW_DAYS} days since delivery)`,
        400,
      );
    }
  }

  private buildReturnItems(
    order: ReturnOrder,
    payload: CreateReturnRequestDto,
    alreadyReturned: Record<number, number>,
  ) {
    const itemMap = new Map<number, any>((order.items as any[]).map((item: any) => [item.orderItemId, item]));
    let totalRefundAmount = new Prisma.Decimal(0);
    const returnItems: any[] = [];

    for (const item of payload.items) {
      const orderItem: any = itemMap.get(item.orderItemId);
      if (!orderItem) {
        throw new ServiceError(
          'ORDER_ITEM_NOT_FOUND',
          `Order item #${item.orderItemId} does not belong to this order`,
          400,
        );
      }

      const returnedQty = alreadyReturned[item.orderItemId] ?? 0;
      const maxQty = orderItem.quantity - returnedQty;
      if (maxQty <= 0 || item.quantity > maxQty) {
        throw new ServiceError(
          'INVALID_RETURN_QUANTITY',
          `Return quantity exceeds allowed limit for item #${item.orderItemId} (max ${maxQty})`,
          400,
        );
      }

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

    return { returnItems, totalRefundAmount };
  }

  private async getAlreadyReturnedQuantities(payload: CreateReturnRequestDto, tx: ReturnTx) {
    try {
      return (
        (await this.repo.getAlreadyReturnedQtyByOrderItem(
          payload.items.map((item) => item.orderItemId),
          tx,
        )) ?? {}
      );
    } catch {
      return {};
    }
  }

  private async loadRefundableRequest(tx: ReturnTx, id: number) {
    const request = await tx.returnRequest.findUnique({
      where: { returnRequestId: id },
    });

    if (!request) {
      throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
    }

    this.assertTransition(request.status, 'REFUNDED');
    return request;
  }

  private resolveRefundAmount(request: { totalRefundAmount: Prisma.Decimal }, amount?: number) {
    const refundAmount = new Prisma.Decimal(amount ?? request.totalRefundAmount.toNumber());
    if (refundAmount.lte(0) || refundAmount.gt(request.totalRefundAmount)) {
      throw new ServiceError('INVALID_REFUND_AMOUNT', 'Invalid refund amount (exceeds allowed limit)');
    }

    return refundAmount;
  }

  // ─── Customer: Create ──────────────────────────────────────────────────────

  async createReturnRequest(userId: number, payload: CreateReturnRequestDto) {
    const order = this.ensureOrderCanBeReturned(
      await this.repo.findOrderForReturn(payload.orderId),
      userId,
    );
    const deliveredAt = this.resolveDeliveredAt(order);
    this.assertReturnWindow(deliveredAt);

    const result = await prisma.$transaction(async (tx: ReturnTx) => {
      const alreadyReturned = await this.getAlreadyReturnedQuantities(payload, tx);
      const { returnItems, totalRefundAmount } = this.buildReturnItems(
        order,
        payload,
        alreadyReturned,
      );

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

  async createLegacyCompatibleReturnRequest(
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) {
    const order = await this.repo.findOrderForReturn(payload.orderId);
    if (!order) {
      throw new ServiceError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    const orderItems = Array.isArray(order.items) ? order.items : [];
    const alreadyReturned =
      (await this.repo.getAlreadyReturnedQtyByOrderItem(
        orderItems.map((item: { orderItemId: number }) => item.orderItemId),
        prisma,
      )) ?? {};
    const legacyCompatibleItems = orderItems
      .map((item: { orderItemId: number; quantity: number }) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity - (alreadyReturned[item.orderItemId] ?? 0),
      }))
      .filter(
        (item: { orderItemId: number; quantity: number }) =>
          Number.isFinite(item.orderItemId) &&
          item.orderItemId > 0 &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0,
      );

    const draft = buildLegacyCreateReturnDraft(
      {
        ...order,
        items: legacyCompatibleItems,
      },
      payload.reason,
      payload.proofImages,
    );
    if (!draft) {
      throw new ServiceError(
        'LEGACY_CREATE_REQUIRES_ITEM_SELECTION',
        'Legacy create flow requires explicit item selection before migration',
        409,
      );
    }

    return this.createReturnRequest(userId, draft);
  }

  // ─── Admin: Approve ────────────────────────────────────────────────────────

  async approveReturnRequest(id: number, actorId: number) {
    return this.transitionAndNotify(
      id,
      actorId,
      'APPROVED',
      'Approved by support/admin',
    );
  }

  // ─── Admin: Reject ─────────────────────────────────────────────────────────

  async rejectReturnRequest(id: number, actorId: number, reason: string) {
    return this.transitionAndNotify(id, actorId, 'REJECTED', reason, { comment: reason });
  }

  // ─── Admin: Mark Received ──────────────────────────────────────────────────

  async markReturnReceived(id: number, actorId: number) {
    return this.transitionAndNotify(
      id,
      actorId,
      'RECEIVED',
      'Warehouse confirmed return package received',
    );
  }

  // ─── Admin: Refund ─────────────────────────────────────────────────────────

  async refundReturnRequest(
    id: number,
    actorId: number,
    params: { method: RefundMethod; amount?: number; idempotencyKey: string },
  ) {
    const refund = await prisma.$transaction(async (tx: ReturnTx) => {
      // Idempotency guard — return existing record if same key
      const existing = await tx.refundTransaction.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) return existing;

      const request = await this.loadRefundableRequest(tx, id);
      const amount = this.resolveRefundAmount(request, params.amount);

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

  private async transitionAndNotify(
    id: number,
    actorId: number,
    nextStatus: Extract<ReturnRequestStatus, 'APPROVED' | 'REJECTED' | 'RECEIVED'>,
    comment: string,
    extraPayload?: Record<string, unknown>,
  ) {
    const result = await this.transitionStatus(id, actorId, nextStatus, comment);
    notifyCustomer(this.transitionNotifications[nextStatus], {
      returnRequestId: id,
      orderId: result.orderId,
      ...extraPayload,
    });
    return result;
  }

  private async transitionStatus(
    id: number,
    actorId: number,
    nextStatus: ReturnRequestStatus,
    comment: string,
  ) {
    return prisma.$transaction(async (tx: ReturnTx) => {
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

  getReturnDetailByOrderId(orderId: number) {
    return this.repo.findByOrderId(orderId);
  }

  getAdminReturns(filters: Parameters<ReturnRequestRepository['findAllAdmin']>[0]) {
    return this.repo.findAllAdmin(filters);
  }
}
