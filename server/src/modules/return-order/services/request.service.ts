import { Prisma } from '../../../generated/client';
import { prisma } from '../../../utils/prisma';
import { ReturnRequestRepository, TxClient } from '../repositories/request.repository';
import { CreateReturnRequestDto } from '../validators/request.validator';
import { notifyCustomer } from '../../../utils/notification.util';
import { buildLegacyCreateReturnDraft } from '../../../shared/legacy-returns.create.adapter';
import { isSettledPaymentStatus } from '../../../config/paymentStatus.config';
import {
  RefundMethod,
  RefundWorkflowStatus,
  REFUND_WORKFLOW_STATUSES,
  RETURN_REQUEST_TRANSITIONS,
  ReturnRequestStatus,
} from '../types';

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 7);
const DELIVERED_ORDER_STATUSES = ['delivered', 'đã giao', 'da giao', 'dagiao'] as const;

type ReturnOrder = NonNullable<Awaited<ReturnType<ReturnRequestRepository['findOrderForReturn']>>>;
type ReturnTx = Extract<TxClient, Prisma.TransactionClient>;
type ReturnItemSnapshot = {
  quantity?: unknown;
  unitPrice?: unknown;
  requestedRefundAmount?: unknown;
  orderItemGrossAmount?: unknown;
  orderItemAllocatedDiscountAmount?: unknown;
  orderItemNetPaidAmount?: unknown;
};

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ReturnRequestService {
  private readonly repo = new ReturnRequestRepository();
  private readonly refundableRequestInclude = {
    items: {
      select: {
        quantity: true,
        unitPrice: true,
      },
    },
  } as const;
  private readonly adminRefundStatuses: RefundWorkflowStatus[] = [
    'PENDING',
    'PROCESSING',
    'FAILED',
    'MANUAL_REVIEW',
  ];

  private readonly transitionNotifications = {
    APPROVED: 'RETURN_APPROVED',
    REJECTED: 'RETURN_REJECTED',
    RECEIVED: 'RETURN_RECEIVED',
  } as const;
  private readonly preDeliveryCancellationReason = 'PRE_DELIVERY_CANCELLATION';

  private normalizeStatus(value: unknown): string {
    return String(value ?? '').toLowerCase().trim();
  }

  private normalizeWorkflowStatus(value: unknown): string {
    return String(value ?? '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  }

  private bucketReturnStatus(value: unknown): string {
    const normalized = this.normalizeWorkflowStatus(value);

    if (
      normalized === 'PENDING_APPROVAL' ||
      normalized === 'REQUESTED' ||
      normalized === 'SUBMITTED' ||
      normalized === 'PENDING_PAYMENT_CONFIRMATION' ||
      normalized === 'PENDING_ADMIN_REVIEW'
    ) {
      return 'REQUESTED';
    }

    if (normalized === 'APPROVED' || normalized === 'IN_RETURN_TRANSIT') {
      return 'APPROVED';
    }

    if (normalized === 'REJECTED') {
      return 'REJECTED';
    }

    if (
      normalized === 'RECEIVED' ||
      normalized === 'RECEIVED_AND_INSPECTING' ||
      normalized === 'ACCEPTED_FOR_REFUND'
    ) {
      return 'RECEIVED';
    }

    if (normalized === 'COMPLETED' || normalized === 'REFUNDED' || normalized === 'CLOSED') {
      return 'REFUNDED';
    }

    return 'REQUESTED';
  }

  private toNumericAmount(value: unknown): number {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }

    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  }

  private toDecimalAmount(value: unknown): Prisma.Decimal {
    if (value instanceof Prisma.Decimal) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return new Prisma.Decimal(value);
    }

    if (typeof value === 'bigint') {
      return new Prisma.Decimal(value.toString());
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      return new Prisma.Decimal(String(value));
    }

    return new Prisma.Decimal(0);
  }

  private normalizeRefundTransactionStatus(value: unknown): string {
    return String(value ?? '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  }

  private coerceRefundWorkflowStatus(value: unknown): RefundWorkflowStatus | null {
    const normalized = this.normalizeRefundTransactionStatus(value);
    return (REFUND_WORKFLOW_STATUSES as readonly string[]).includes(normalized)
      ? (normalized as RefundWorkflowStatus)
      : null;
  }

  private resolveSnapshotItemsTotal(items?: ReturnItemSnapshot[] | null): Prisma.Decimal {
    if (!Array.isArray(items)) {
      return new Prisma.Decimal(0);
    }

    return items.reduce((sum, item) => {
      const quantity = Number(item?.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum.plus(this.toDecimalAmount(item?.unitPrice).mul(quantity));
    }, new Prisma.Decimal(0));
  }

  private summarizeItemEconomicsSnapshot(items?: ReturnItemSnapshot[] | null) {
    if (!Array.isArray(items)) {
      return {
        totalGrossAmount: new Prisma.Decimal(0),
        totalDiscountAmount: new Prisma.Decimal(0),
        totalNetPaidAmount: new Prisma.Decimal(0),
        totalRequestedRefundAmount: new Prisma.Decimal(0),
        hasSnapshotBreakdown: false,
      };
    }

    const totalGrossAmount = items.reduce(
      (sum, item) => sum.plus(this.toDecimalAmount(item?.orderItemGrossAmount)),
      new Prisma.Decimal(0),
    );
    const totalDiscountAmount = items.reduce(
      (sum, item) => sum.plus(this.toDecimalAmount(item?.orderItemAllocatedDiscountAmount)),
      new Prisma.Decimal(0),
    );
    const totalNetPaidAmount = items.reduce(
      (sum, item) => sum.plus(this.toDecimalAmount(item?.orderItemNetPaidAmount)),
      new Prisma.Decimal(0),
    );
    const totalRequestedRefundAmount = items.reduce((sum, item) => {
      const requestedRefundAmount = this.toDecimalAmount(item?.requestedRefundAmount);
      if (requestedRefundAmount.gt(0)) {
        return sum.plus(requestedRefundAmount);
      }

      const quantity = Number(item?.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return sum;
      }

      return sum.plus(this.toDecimalAmount(item?.unitPrice).mul(quantity));
    }, new Prisma.Decimal(0));
    const hasSnapshotBreakdown =
      totalGrossAmount.gt(0) || totalDiscountAmount.gt(0) || totalNetPaidAmount.gt(0);

    return {
      totalGrossAmount,
      totalDiscountAmount,
      totalNetPaidAmount,
      totalRequestedRefundAmount,
      hasSnapshotBreakdown,
    };
  }

  private resolveRefundableCapFromItemSnapshots(
    totalRefundAmount: unknown,
    items?: ReturnItemSnapshot[] | null,
  ): Prisma.Decimal {
    const totalRefundDecimal = this.toDecimalAmount(totalRefundAmount);
    const itemSnapshotTotal = this.resolveSnapshotItemsTotal(items);

    if (itemSnapshotTotal.lte(0)) {
      return totalRefundDecimal;
    }

    if (totalRefundDecimal.lte(0)) {
      return itemSnapshotTotal;
    }

    return Prisma.Decimal.min(totalRefundDecimal, itemSnapshotTotal);
  }

  private buildOrderItemDiscountAllocation(order: ReturnOrder) {
    const itemSubtotals = order.items.map((orderItem) =>
      this.toDecimalAmount(orderItem.unitPrice).mul(orderItem.quantity),
    );
    const orderItemsSubtotal = itemSubtotals.reduce(
      (sum, subtotal) => sum.plus(subtotal),
      new Prisma.Decimal(0),
    );
    const orderDiscountAmount = this.toDecimalAmount(
      (order as unknown as { discountAmount?: unknown }).discountAmount,
    );
    const discountCapsToSubtotal = Prisma.Decimal.min(orderDiscountAmount, orderItemsSubtotal);
    let allocatedDiscountRemainder = discountCapsToSubtotal;
    const allocatedDiscountByOrderItem = new Map<number, Prisma.Decimal>();

    order.items.forEach((orderItem, index) => {
      const itemSubtotal = itemSubtotals[index] ?? new Prisma.Decimal(0);
      const isLastItem = index === order.items.length - 1;
      const allocatedDiscount =
        orderItemsSubtotal.lte(0) || discountCapsToSubtotal.lte(0)
          ? new Prisma.Decimal(0)
          : isLastItem
            ? allocatedDiscountRemainder
            : discountCapsToSubtotal
                .mul(itemSubtotal)
                .div(orderItemsSubtotal)
                .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      allocatedDiscountByOrderItem.set(orderItem.orderItemId, allocatedDiscount);
      allocatedDiscountRemainder = Prisma.Decimal.max(
        allocatedDiscountRemainder.minus(allocatedDiscount),
        new Prisma.Decimal(0),
      );
    });

    return allocatedDiscountByOrderItem;
  }

  private resolveOrderItemNetPaidLineAmount(
    orderItem: ReturnOrder['items'][number],
    allocatedDiscountByOrderItem: Map<number, Prisma.Decimal>,
  ) {
    const orderItemSubtotal = this.toDecimalAmount(orderItem.unitPrice).mul(orderItem.quantity);
    const persistedNetPaidAmount = this.toDecimalAmount(
      (orderItem as unknown as { netItemPaidAmount?: unknown }).netItemPaidAmount,
    );
    const allocatedDiscount =
      allocatedDiscountByOrderItem.get(orderItem.orderItemId) ?? new Prisma.Decimal(0);

    return persistedNetPaidAmount.gt(0)
      ? persistedNetPaidAmount
      : Prisma.Decimal.max(
          orderItemSubtotal.minus(allocatedDiscount),
          new Prisma.Decimal(0),
        );
  }

  private assertModernStorageAvailable(requiredDelegates: string[]) {
    const missingDelegates = requiredDelegates.filter(
      (delegateName) =>
        typeof ((prisma as unknown) as Record<string, unknown>)[delegateName] === 'undefined',
    );

    if (missingDelegates.length > 0) {
      throw new ServiceError(
        'RETURN_REQUEST_STORAGE_UNAVAILABLE',
        `Modern return storage is not provisioned for this environment. Missing Prisma delegates: ${missingDelegates.join(', ')}`,
        503,
      );
    }
  }

  private deriveRefundStatus(record: {
    refundStatus?: unknown;
    status?: unknown;
    totalRefundAmount?: unknown;
    items?: Array<{ quantity?: unknown; unitPrice?: unknown }> | null;
    refundTransactions?: Array<{ amount?: unknown; status?: unknown }> | null;
  }): RefundWorkflowStatus {
    const explicitRefundStatus = this.coerceRefundWorkflowStatus(record.refundStatus);
    if (explicitRefundStatus) {
      return explicitRefundStatus;
    }

    const rawStatus = this.normalizeWorkflowStatus(record.status);
    const refundTransactions = Array.isArray(record.refundTransactions)
      ? record.refundTransactions
      : [];
    const refundableCap = this.toNumericAmount(
      this.resolveRefundableCapFromItemSnapshots(record.totalRefundAmount, record.items),
    );
    const completedRefunds = refundTransactions.filter(
      (transaction) =>
        this.normalizeRefundTransactionStatus(transaction?.status) === 'COMPLETED',
    );
    const refundedAmount = completedRefunds.reduce(
      (sum, transaction) => sum + this.toNumericAmount(transaction?.amount),
      0,
    );

    if (rawStatus === 'PENDING_PAYMENT_CONFIRMATION') {
      return 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
    }

    if (
      refundTransactions.some(
        (transaction) =>
          this.normalizeRefundTransactionStatus(transaction?.status) === 'FAILED',
      )
    ) {
      return 'FAILED';
    }

    if (
      refundTransactions.some((transaction) => {
        const normalized = this.normalizeRefundTransactionStatus(transaction?.status);
        return normalized === 'PENDING' || normalized === 'PROCESSING';
      })
    ) {
      return 'PROCESSING';
    }

    if (completedRefunds.length > 0) {
      if (refundableCap > 0 && refundedAmount > 0 && refundedAmount < refundableCap) {
        return 'PARTIALLY_REFUNDED';
      }

      return 'REFUNDED';
    }

    if (refundTransactions.length > 0) {
      return 'MANUAL_REVIEW';
    }

    if (rawStatus === 'ACCEPTED_FOR_REFUND') {
      return 'PENDING';
    }

    if (rawStatus === 'CLOSED') {
      return 'REFUNDED';
    }

    return 'NOT_APPLICABLE';
  }

  private resolveTransitionRefundStatus(
    current: { status?: unknown; refundStatus?: unknown },
    nextStatus: ReturnRequestStatus,
  ): RefundWorkflowStatus | undefined {
    if (nextStatus === 'PENDING_PAYMENT_CONFIRMATION') {
      return 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
    }

    if (nextStatus === 'REJECTED') {
      return 'NOT_APPLICABLE';
    }

    if (nextStatus === 'ACCEPTED_FOR_REFUND') {
      return 'PENDING';
    }

    const currentRefundStatus = this.coerceRefundWorkflowStatus(current.refundStatus);
    if (currentRefundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED') {
      return 'NOT_APPLICABLE';
    }

    return currentRefundStatus ?? undefined;
  }

  private async syncRequestRefundStatus(
    tx: ReturnTx,
    request: {
      returnRequestId: number;
      status?: unknown;
      refundStatus?: unknown;
      totalRefundAmount?: unknown;
      items?: Array<{ quantity?: unknown; unitPrice?: unknown }> | null;
    },
    refundTransactions: Array<{ amount?: unknown; status?: unknown }>,
  ) {
    const derivedRefundStatus = this.deriveRefundStatus({
      status: request.status,
      totalRefundAmount: request.totalRefundAmount,
      items: request.items,
      refundTransactions,
    });
    const currentRefundStatus = this.coerceRefundWorkflowStatus(request.refundStatus);

    if (currentRefundStatus === derivedRefundStatus) {
      return derivedRefundStatus;
    }

    await tx.returnRequest.update({
      where: { returnRequestId: request.returnRequestId },
      data: { refundStatus: derivedRefundStatus },
    });

    return derivedRefundStatus;
  }

  private decorateStatusLogs(statusLogs: unknown) {
    if (!Array.isArray(statusLogs)) {
      return statusLogs;
    }

    return statusLogs.map((statusLog: any) => ({
      ...statusLog,
      fromWorkflowStatus: statusLog?.fromWorkflowStatus ?? statusLog?.fromStatus ?? null,
      toWorkflowStatus: statusLog?.toWorkflowStatus ?? statusLog?.toStatus ?? null,
    }));
  }

  private decorateReturnItems(items: unknown) {
    if (!Array.isArray(items)) {
      return items;
    }

    return items.map((item: any) => {
      const quantity = Number(item?.quantity ?? 0);
      const refundUnitAmount = this.toDecimalAmount(item?.unitPrice);
      const requestedRefundAmount =
        Number.isFinite(quantity) && quantity > 0
          ? refundUnitAmount.mul(quantity)
          : new Prisma.Decimal(0);
      const orderItem = item?.orderItem;
      const orderItemGrossAmount =
        typeof orderItem !== 'undefined'
          ? this.toDecimalAmount(orderItem?.grossItemAmount)
          : null;
      const orderItemAllocatedDiscountAmount =
        typeof orderItem !== 'undefined'
          ? this.toDecimalAmount(orderItem?.allocatedDiscountAmount)
          : null;
      const orderItemNetPaidAmount =
        typeof orderItem !== 'undefined'
          ? this.toDecimalAmount(orderItem?.netItemPaidAmount)
          : null;
      const variantPrimaryImage =
        Array.isArray(orderItem?.variant?.images) && orderItem.variant.images.length > 0
          ? orderItem.variant.images[0]
          : null;
      const productPrimaryImage =
        Array.isArray(orderItem?.variant?.product?.images) && orderItem.variant.product.images.length > 0
          ? orderItem.variant.product.images[0]
          : null;
      const resolvedThumbnailUrl =
        variantPrimaryImage?.thumbnailUrl ??
        variantPrimaryImage?.imageUrl ??
        productPrimaryImage?.thumbnailUrl ??
        productPrimaryImage?.imageUrl ??
        null;
      const resolvedImageUrl =
        variantPrimaryImage?.imageUrl ??
        variantPrimaryImage?.thumbnailUrl ??
        productPrimaryImage?.imageUrl ??
        productPrimaryImage?.thumbnailUrl ??
        null;

      const itemAttachments = Array.isArray(item?.attachments) ? item.attachments : [];

      return {
        ...item,
        requestedRefundAmount,
        orderItemGrossAmount,
        orderItemAllocatedDiscountAmount,
        orderItemNetPaidAmount,
        ...(orderItem && (resolvedThumbnailUrl || resolvedImageUrl)
          ? {
              orderItem: {
                ...orderItem,
                thumbnailUrl: orderItem?.thumbnailUrl ?? resolvedThumbnailUrl,
                imageUrl: orderItem?.imageUrl ?? resolvedImageUrl,
                product: {
                  ...(orderItem?.product ?? {}),
                  thumbnailUrl:
                    orderItem?.product?.thumbnailUrl ??
                    productPrimaryImage?.thumbnailUrl ??
                    productPrimaryImage?.imageUrl ??
                    null,
                  imageUrl:
                    orderItem?.product?.imageUrl ??
                    productPrimaryImage?.imageUrl ??
                    productPrimaryImage?.thumbnailUrl ??
                    null,
                  images: Array.isArray(orderItem?.product?.images)
                    ? orderItem.product.images
                    : productPrimaryImage
                      ? [productPrimaryImage]
                      : [],
                },
              },
            }
          : {}),
        ...(itemAttachments.length ? { attachments: itemAttachments } : {}),
      };
    });
  }

  private decorateAttachments(attachments: unknown) {
    if (!Array.isArray(attachments)) {
      return attachments;
    }

    return attachments.map((attachment: any) => ({
      ...attachment,
      returnRequestItemId:
        typeof attachment?.returnRequestItemId === 'number'
          ? attachment.returnRequestItemId
          : null,
    }));
  }

  private extractFinanceNoteContext(record: Record<string, any>) {
    const statusLogs = Array.isArray(record.statusLogs) ? record.statusLogs : [];
    const latestFinanceLog = [...statusLogs]
      .reverse()
      .find((statusLog) => {
        const fromWorkflowStatus = this.normalizeWorkflowStatus(
          statusLog?.fromWorkflowStatus ?? statusLog?.fromStatus,
        );
        const toWorkflowStatus = this.normalizeWorkflowStatus(
          statusLog?.toWorkflowStatus ?? statusLog?.toStatus,
        );
        const comment = String(statusLog?.comment ?? '').trim();

        return (
          comment.length > 0 &&
          fromWorkflowStatus === 'ACCEPTED_FOR_REFUND' &&
          toWorkflowStatus === 'ACCEPTED_FOR_REFUND' &&
          !comment.startsWith('Refund status updated:')
        );
      });

    const persistedFinanceNote =
      typeof record.financeNote === 'string' && record.financeNote.trim().length > 0
        ? record.financeNote.trim()
        : null;
    const matchedFinanceLog = persistedFinanceNote
      ? [...statusLogs]
          .reverse()
          .find((statusLog) => String(statusLog?.comment ?? '').trim() === persistedFinanceNote)
      : latestFinanceLog;

    return {
      financeNote: persistedFinanceNote ?? latestFinanceLog?.comment?.trim() ?? null,
      financeNoteUpdatedAt:
        record.financeNoteUpdatedAt ??
        matchedFinanceLog?.createdAt ??
        null,
      financeNoteUpdatedBy:
        record.financeNoteUpdatedBy ??
        matchedFinanceLog?.changedByUser ??
        null,
    };
  }

  private decorateReturnRecord<T>(record: T): T {
    if (!record || typeof record !== 'object') {
      return record;
    }

    const value = record as Record<string, any>;
    const decoratedAttachments = this.decorateAttachments(value.attachments);
    const attachmentsByReturnRequestItemId = Array.isArray(decoratedAttachments)
      ? decoratedAttachments.reduce((map, attachment: any) => {
          if (typeof attachment?.returnRequestItemId !== 'number') {
            return map;
          }

          const existing = map.get(attachment.returnRequestItemId) ?? [];
          existing.push(attachment);
          map.set(attachment.returnRequestItemId, existing);
          return map;
        }, new Map<number, any[]>())
      : new Map<number, any[]>();
    const rawDecoratedItems = this.decorateReturnItems(value.items);
    const decoratedItems = Array.isArray(rawDecoratedItems)
      ? rawDecoratedItems.map((item: any) => ({
          ...item,
          attachments:
            attachmentsByReturnRequestItemId.get(item?.returnRequestItemId) ??
            item?.attachments ??
            [],
        }))
      : rawDecoratedItems;
    const decoratedStatusLogs = this.decorateStatusLogs(value.statusLogs);
    const financeNoteContext = this.extractFinanceNoteContext({
      ...value,
      statusLogs: decoratedStatusLogs,
    });
    const refundableCapAmount = Array.isArray(decoratedItems)
      ? this.resolveRefundableCapFromItemSnapshots(value.totalRefundAmount, decoratedItems)
      : undefined;
    const workflowStatus = value.workflowStatus ?? value.status ?? null;
    return {
      ...value,
      workflowStatus,
      statusBucket: this.bucketReturnStatus(workflowStatus),
      refundStatus: value.refundStatus ?? this.deriveRefundStatus(value),
      ...(typeof refundableCapAmount !== 'undefined'
        ? { refundableCapAmount }
        : {}),
      ...(typeof value.financeNote !== 'undefined' ||
      typeof value.financeNoteUpdatedAt !== 'undefined' ||
      typeof value.financeNoteUpdatedBy !== 'undefined' ||
      financeNoteContext.financeNote !== null ||
      financeNoteContext.financeNoteUpdatedAt !== null ||
      financeNoteContext.financeNoteUpdatedBy !== null
        ? {
            financeNote: financeNoteContext.financeNote,
            financeNoteUpdatedAt: financeNoteContext.financeNoteUpdatedAt,
            financeNoteUpdatedBy: financeNoteContext.financeNoteUpdatedBy,
          }
        : {}),
      ...(typeof value.statusLogs !== 'undefined'
        ? { statusLogs: decoratedStatusLogs }
        : {}),
      ...(typeof value.attachments !== 'undefined'
        ? { attachments: decoratedAttachments }
        : {}),
      ...(typeof value.items !== 'undefined'
        ? { items: decoratedItems }
        : {}),
    } as T;
  }

  private decoratePagedResult<T extends { data: any[] }>(result: T): T {
    return {
      ...result,
      data: Array.isArray(result.data)
        ? result.data.map((record) => this.decorateReturnRecord(record))
        : [],
    };
  }

  private decorateReturnSummaryRecord<T>(record: T): T {
    const rawValue = record as Record<string, any>;
    const decoratedRecord = this.decorateReturnRecord(record);
    if (!decoratedRecord || typeof decoratedRecord !== 'object') {
      return decoratedRecord;
    }

    const value = decoratedRecord as Record<string, any>;
    const economicsSummary = this.summarizeItemEconomicsSnapshot(
      Array.isArray(rawValue?.items) ? rawValue.items : value.items,
    );
    return {
      returnRequestId: value.returnRequestId,
      orderId: value.orderId,
      workflowStatus: value.workflowStatus ?? null,
      statusBucket: value.statusBucket ?? this.bucketReturnStatus(value.workflowStatus ?? value.status),
      refundStatus: value.refundStatus ?? null,
      totalRefundAmount: value.totalRefundAmount ?? null,
      refundableCapAmount: value.refundableCapAmount ?? null,
      updatedAt: value.updatedAt ?? value.createdAt ?? null,
      financeNote: value.financeNote ?? null,
      financeNoteUpdatedAt: value.financeNoteUpdatedAt ?? null,
      financeNoteUpdatedBy: value.financeNoteUpdatedBy ?? null,
      ...(economicsSummary.hasSnapshotBreakdown ? { economicsSummary } : {}),
    } as T;
  }

  private decorateSummaryPagedResult<T extends { data: any[] }>(result: T): T {
    return {
      ...result,
      data: Array.isArray(result.data)
        ? result.data.map((record) => this.decorateReturnSummaryRecord(record))
        : [],
    };
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
    const deliveredHistory = order.statusHistory?.find((history) =>
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

  private isCodAwaitingPaymentConfirmation(order: ReturnOrder): boolean {
    const method = String(order?.paymentMethod ?? '').trim().toUpperCase();
    if (method !== 'COD') return false;

    return !(order?.payments ?? []).some((payment: { status?: string | null }) =>
      isSettledPaymentStatus(payment?.status),
    );
  }

  private async assertNoActiveReturnRequest(orderId: number): Promise<void> {
    const existingRequest = await this.repo.findActiveByOrderId(orderId);

    if (existingRequest) {
      throw new ServiceError(
        'RETURN_ALREADY_EXISTS',
        'This order already has an active return request',
        409,
        {
          returnRequestId: existingRequest.returnRequestId,
          orderId: existingRequest.orderId,
          workflowStatus: existingRequest.status,
        },
      );
    }
  }

  private buildReturnItems(
    order: ReturnOrder,
    payload: CreateReturnRequestDto,
    alreadyReturned: Record<number, number>,
  ) {
    const itemMap = new Map<number, ReturnOrder['items'][number]>(
      order.items.map((item) => [item.orderItemId, item]),
    );
    let totalRefundAmount = new Prisma.Decimal(0);
    const returnItems: Prisma.ReturnRequestItemCreateWithoutReturnRequestInput[] = [];
    const allocatedDiscountByOrderItem = this.buildOrderItemDiscountAllocation(order);

    for (const item of payload.items) {
      const orderItem = itemMap.get(item.orderItemId);
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
        const productName =
          typeof (orderItem as { productName?: unknown }).productName === 'string' &&
          (orderItem as { productName?: string }).productName?.trim()
            ? (orderItem as { productName: string }).productName.trim()
            : null;
        const variantName =
          typeof (orderItem as { variantName?: unknown }).variantName === 'string' &&
          (orderItem as { variantName?: string }).variantName?.trim()
            ? (orderItem as { variantName: string }).variantName.trim()
            : null;
        const productLabel = [productName, variantName].filter(Boolean).join(' - ') || `item #${item.orderItemId}`;
        throw new ServiceError(
          'INVALID_RETURN_QUANTITY',
          `Return quantity exceeds allowed limit for ${productLabel} (max ${maxQty})`,
          400,
          {
            orderItemId: item.orderItemId,
            maxQty,
            productLabel,
          },
        );
      }

      const netPaidLineAmount = this.resolveOrderItemNetPaidLineAmount(
        orderItem,
        allocatedDiscountByOrderItem,
      );
      const refundableLineAmount = netPaidLineAmount
        .mul(item.quantity)
        .div(orderItem.quantity)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const effectiveRefundUnitPrice = refundableLineAmount
        .div(item.quantity)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      totalRefundAmount = totalRefundAmount.plus(refundableLineAmount);

      returnItems.push({
        orderItem: { connect: { orderItemId: orderItem.orderItemId } },
        quantity: item.quantity,
        unitPrice: effectiveRefundUnitPrice,
        reason: item.reason,
        reasonText: item.reasonText,
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
      include: this.refundableRequestInclude,
    });

    if (!request) {
      throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
    }

    this.assertTransition(request.status, 'CLOSED');
    return request;
  }

  private resolveRefundableAmountCap(
    request: {
      totalRefundAmount: Prisma.Decimal;
      items?: Array<{ quantity?: number; unitPrice?: unknown }> | null;
    },
  ) {
    return this.resolveRefundableCapFromItemSnapshots(request.totalRefundAmount, request.items);
  }

  private resolveRefundAmount(
    request: {
      totalRefundAmount: Prisma.Decimal;
      items?: Array<{ quantity?: number; unitPrice?: unknown }> | null;
    },
    amount?: number,
  ) {
    const refundableCap = this.resolveRefundableAmountCap(request);
    const refundAmount = new Prisma.Decimal(amount ?? refundableCap.toNumber());
    if (refundAmount.lte(0) || refundAmount.gt(refundableCap)) {
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
    await this.assertNoActiveReturnRequest(order.orderId);
    const initialStatus = this.isCodAwaitingPaymentConfirmation(order)
      ? 'PENDING_PAYMENT_CONFIRMATION'
      : 'PENDING_ADMIN_REVIEW';
    const initialRefundStatus: RefundWorkflowStatus = initialStatus === 'PENDING_PAYMENT_CONFIRMATION'
      ? 'LOCKED_UNTIL_PAYMENT_CONFIRMED'
      : 'NOT_APPLICABLE';
    const initialComment = initialStatus === 'PENDING_PAYMENT_CONFIRMATION'
      ? 'Customer created return request. Awaiting COD payment confirmation'
      : 'Customer created return request. Awaiting admin review';
    this.assertModernStorageAvailable(['returnRequest', 'returnRequestAttachment']);

    const result = await prisma.$transaction(async (tx: ReturnTx) => {
      const alreadyReturned = await this.getAlreadyReturnedQuantities(payload, tx);
      const { returnItems, totalRefundAmount } = this.buildReturnItems(
        order,
        payload,
        alreadyReturned,
      );

      const createdRequest = await this.repo.createReturnRequest(
        {
          order: { connect: { orderId: order.orderId } },
          user: { connect: { userId } },
          reason: payload.reason,
          note: payload.note,
          deliveredAt,
          totalRefundAmount,
          status: initialStatus,
          refundStatus: initialRefundStatus,
          items: { create: returnItems },
          attachments: (payload.requestAttachments ?? payload.attachments)?.length
            ? {
                create: (payload.requestAttachments ?? payload.attachments ?? []).map((fileUrl) => ({
                  fileUrl,
                })),
              }
            : undefined,
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: initialStatus,
              changedBy: userId,
              comment: initialComment,
            },
          },
        },
        tx,
      );

      const createdItemAttachments = await Promise.all(
        payload.items.flatMap((item) => {
          if (!item.attachments?.length) {
            return [];
          }

          const createdReturnItem = createdRequest.items.find(
            (createdItem) => createdItem.orderItemId === item.orderItemId,
          );

          if (!createdReturnItem) {
            return [];
          }

          return item.attachments.map((fileUrl) =>
            tx.returnRequestAttachment.create({
              data: {
                returnRequest: {
                  connect: { returnRequestId: createdRequest.returnRequestId },
                },
                returnRequestItem: {
                  connect: { returnRequestItemId: createdReturnItem.returnRequestItemId },
                },
                fileUrl,
              },
            }),
          );
        }),
      );

      return createdItemAttachments.length > 0
        ? {
            ...createdRequest,
            attachments: [...(createdRequest.attachments ?? []), ...createdItemAttachments],
          }
        : createdRequest;
    });

    // Mock notification
    notifyCustomer('RETURN_REQUESTED', {
      returnRequestId: result.returnRequestId,
      orderId: result.orderId,
    });

    return this.decorateReturnRecord(result);
  }

  async createLegacyCompatibleReturnRequest(
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) {
    const order = await this.repo.findOrderForReturn(payload.orderId);
    if (!order) {
      throw new ServiceError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    await this.assertNoActiveReturnRequest(order.orderId);

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
        'ITEM_SELECTION_REQUIRED',
        'Explicit item selection is required for this legacy create request',
        409,
      );
    }

    return this.createReturnRequest(userId, {
      ...draft,
      items: draft.items.map((item) => ({
        ...item,
        reason: draft.reason,
      })),
    });
  }

  // ─── Admin: Approve ────────────────────────────────────────────────────────

  async approveReturnRequest(id: number, actorId: number) {
    const detail = await this.repo.findById(id);
    if (!detail) {
      throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
    }

    if (detail.reason === this.preDeliveryCancellationReason) {
      this.assertModernStorageAvailable(['returnRequest', 'returnRequestStatusLog']);

      return prisma.$transaction(async (tx: ReturnTx) => {
        const current = await tx.returnRequest.findUnique({
          where: { returnRequestId: id },
        });
        if (!current) {
          throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
        }
        if (current.status !== 'PENDING_ADMIN_REVIEW') {
          throw new ServiceError(
            'INVALID_STATE_TRANSITION',
            `Cannot transition from ${current.status} to ACCEPTED_FOR_REFUND`,
            400,
          );
        }

        const updated = await tx.returnRequest.update({
          where: { returnRequestId: id },
          data: {
            status: 'ACCEPTED_FOR_REFUND',
            refundStatus: 'PENDING',
            updatedAt: new Date(),
          },
        });

        await tx.returnRequestStatusLog.create({
          data: {
            returnRequestId: id,
            fromStatus: current.status,
            toStatus: 'ACCEPTED_FOR_REFUND',
            changedBy: actorId,
            comment: 'Approved for refund queue after prepaid cancellation before fulfillment',
          },
        });

        return this.decorateReturnRecord(updated);
      });
    }

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

  async markReturnInTransit(id: number, actorId: number) {
    return this.transitionStatus(
      id,
      actorId,
      'IN_RETURN_TRANSIT',
      'Return package handed off for transit back to warehouse',
    );
  }

  async markReturnReceived(id: number, actorId: number) {
    const result = await this.transitionStatus(
      id,
      actorId,
      'RECEIVED_AND_INSPECTING',
      'Warehouse confirmed return package received and inspection started',
    );
    notifyCustomer('RETURN_RECEIVED', {
      returnRequestId: id,
      orderId: result.orderId,
    });
    return this.decorateReturnRecord(result);
  }

  async acceptReturnForRefund(id: number, actorId: number) {
    return this.transitionStatus(
      id,
      actorId,
      'ACCEPTED_FOR_REFUND',
      'Return accepted for refund after receive and inspection',
    );
  }

  // ─── Admin: Refund ─────────────────────────────────────────────────────────

  async refundReturnRequest(
    id: number,
    actorId: number,
    params: { method: RefundMethod; amount?: number; idempotencyKey: string },
  ) {
    this.assertModernStorageAvailable([
      'refundTransaction',
      'returnRequest',
      'returnRequestStatusLog',
    ]);

    const refund = await prisma.$transaction(async (tx: ReturnTx) => {
      // Idempotency guard — return existing record if same key
      const existing = await tx.refundTransaction.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        const request = await tx.returnRequest.findUnique({
          where: { returnRequestId: id },
          include: this.refundableRequestInclude,
        });
        if (!request) {
          throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
        }

        await this.syncRequestRefundStatus(tx, request, [existing]);
        return existing;
      }

      const request = await this.loadRefundableRequest(tx, id);
      const refundableCap = this.resolveRefundableAmountCap(request);
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
        data: {
          status: 'CLOSED',
          refundStatus: amount.lt(refundableCap) ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: 'CLOSED',
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

  async updateRefundStatus(
    id: number,
    actorId: number,
    params: { refundStatus: RefundWorkflowStatus; comment?: string },
  ) {
    this.assertModernStorageAvailable(['returnRequest', 'returnRequestStatusLog']);
    const normalizedComment = params.comment?.trim();

    if (!this.adminRefundStatuses.includes(params.refundStatus)) {
      throw new ServiceError('INVALID_REFUND_STATUS', 'Invalid refund status', 400);
    }

    if (
      (params.refundStatus === 'FAILED' || params.refundStatus === 'MANUAL_REVIEW') &&
      !normalizedComment
    ) {
      throw new ServiceError(
        'REFUND_STATUS_COMMENT_REQUIRED',
        'A comment is required when refund status is FAILED or MANUAL_REVIEW',
        400,
      );
    }

    return prisma.$transaction(async (tx: ReturnTx) => {
      const financeNoteUpdatedAt = normalizedComment ? new Date() : null;
      const current = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
      });
      if (!current) {
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
      }

      if (current.status === 'PENDING_PAYMENT_CONFIRMATION') {
        throw new ServiceError(
          'RETURN_REFUND_LOCKED',
          'Refund execution is locked until payment is confirmed',
          409,
        );
      }

      if (current.status !== 'ACCEPTED_FOR_REFUND') {
        throw new ServiceError(
          'INVALID_STATE_TRANSITION',
          `Cannot update refund status while return status is ${current.status}`,
          400,
        );
      }

      const currentRefundStatus =
        this.coerceRefundWorkflowStatus(current.refundStatus) ??
        this.deriveRefundStatus(current);
      const currentFinanceNote = typeof (current as any).financeNote === 'string'
        ? (current as any).financeNote.trim()
        : null;

      if (
        currentRefundStatus === params.refundStatus &&
        currentFinanceNote === (normalizedComment ?? null)
      ) {
        return this.decorateReturnRecord(current);
      }

      const updated = await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: {
          refundStatus: params.refundStatus,
          financeNote:
            params.refundStatus === 'FAILED' || params.refundStatus === 'MANUAL_REVIEW'
              ? normalizedComment ?? null
              : null,
          updatedAt: new Date(),
        },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: current.status,
          toStatus: current.status,
          changedBy: actorId,
          comment:
            normalizedComment ??
            `Refund status updated: ${currentRefundStatus} -> ${params.refundStatus}`,
          ...(financeNoteUpdatedAt ? { createdAt: financeNoteUpdatedAt } : {}),
        },
      });

      return this.decorateReturnRecord({
        ...updated,
        ...(financeNoteUpdatedAt
          ? {
              financeNoteUpdatedAt,
              financeNoteUpdatedBy: { userId: actorId },
            }
          : {
              financeNoteUpdatedAt: null,
              financeNoteUpdatedBy: null,
            }),
      });
    });
  }

  // ─── Shared: status transition ─────────────────────────────────────────────

  private async transitionAndNotify(
    id: number,
    actorId: number,
    nextStatus: Extract<ReturnRequestStatus, 'APPROVED' | 'REJECTED'>,
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
    this.assertModernStorageAvailable(['returnRequest', 'returnRequestStatusLog']);

    return prisma.$transaction(async (tx: ReturnTx) => {
      const current = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
      });
      if (!current)
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);

      this.assertTransition(current.status, nextStatus);
      const nextRefundStatus = this.resolveTransitionRefundStatus(current, nextStatus);

      const updated = await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
          ...(nextRefundStatus ? { refundStatus: nextRefundStatus } : {}),
        },
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

      return this.decorateReturnRecord(updated);
    });
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getMyReturns(
    userId: number,
    page: number,
    limit: number,
    view: 'full' | 'summary' = 'full',
    filters: { orderIds?: number[]; updatedSince?: Date } = {},
  ) {
    this.assertModernStorageAvailable(['returnRequest']);
    return this.repo
      .findByUser(userId, page, limit, filters)
      .then((result: { data: any[] }) =>
        view === 'summary'
          ? this.decorateSummaryPagedResult(result)
          : this.decoratePagedResult(result),
      );
  }

  getReturnDetail(id: number) {
    this.assertModernStorageAvailable(['returnRequest']);
    return this.repo.findById(id).then((result: any) => this.decorateReturnRecord(result));
  }

  getReturnDetailByOrderId(orderId: number) {
    this.assertModernStorageAvailable(['returnRequest']);
    return this.repo
      .findByOrderId(orderId)
      .then((result: any) => this.decorateReturnRecord(result));
  }

  getAdminReturns(filters: Parameters<ReturnRequestRepository['findAllAdmin']>[0]) {
    this.assertModernStorageAvailable(['returnRequest']);
    return this.repo
      .findAllAdmin(filters)
      .then((result: { data: any[] }) => this.decoratePagedResult(result));
  }
}
