import { Prisma } from '../../../generated/client';
import { prisma } from '../../../utils/prisma';
import { ReturnRequestRepository, TxClient } from '../repositories/request.repository';
import {
  CompleteBankRefundDto,
  CreateReturnRequestDto,
  UploadPayoutProofImageDto,
} from '../validators/request.validator';
import { notifyCustomer } from '../../../utils/notification.util';
import { buildLegacyCreateReturnDraft } from '../../../shared/legacy-returns.create.adapter';
import { isSettledPaymentStatus } from '../../../config/paymentStatus.config';
import { cloudinaryService } from '../../../services/cloudinary.service';
import {
  sendRefundAcceptedAwaitingPayoutEmail,
  sendRefundAcceptedBankInfoRequiredEmail,
  sendRefundCompletedBenefitIssuedEmail,
} from '../../../services/email.service';
import { env } from '../../../lib/env';
import { logger } from '../../../lib/logger';
import {
  RefundMethod,
  RefundWorkflowStatus,
  REFUND_WORKFLOW_STATUSES,
  RETURN_REQUEST_TRANSITIONS,
  ReturnRequestStatus,
} from '../types';

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS || 7);
const REFUND_BENEFIT_VALID_DAYS = Number(process.env.REFUND_BENEFIT_VALID_DAYS || 14);
const REFUND_BENEFIT_MIN_ORDER_VALUE = Number(process.env.REFUND_BENEFIT_MIN_ORDER_VALUE || 0);
const DEFAULT_FREESHIP_COUPON_VALUE = Number(process.env.REFUND_FREESHIP_COUPON_VALUE || 30000);
const DELIVERED_ORDER_STATUSES = ['delivered', 'đã giao', 'da giao', 'dagiao'] as const;
const PROFILE_BANK_LINK = `${env.clientUrl}/profile`;
const PROFILE_VOUCHER_LINK = `${env.clientUrl}/profile`;

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
type RefundBenefitRule = {
  benefitType: 'FREESHIP' | 'PERCENTAGE';
  percentValue: Prisma.Decimal | null;
  maxDiscountAmount: Prisma.Decimal | null;
  minOrderValue: Prisma.Decimal;
  summary: string;
  couponType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  couponValue: Prisma.Decimal;
  couponMaxDiscountAmount: Prisma.Decimal | null;
};
type BankAccountRecord = {
  bankAccountId: number;
  bankName: string;
  bankCode: string | null;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string | null;
  inputMethod: string;
  isDefault: boolean;
  updatedAt: Date;
};
type BankSnapshotRecord = {
  bankAccountId: number | null;
  bankName: string;
  bankCode: string | null;
  accountNumberMasked: string;
  accountHolder: string;
  qrImageUrl: string | null;
  inputMethod: string;
  capturedAt: Date;
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

  private maskBankAccountNumber(accountNumber: string) {
    const normalized = accountNumber.replace(/\s+/g, '');
    if (normalized.length <= 4) {
      return normalized;
    }

    return `****${normalized.slice(-4)}`;
  }

  private formatRefundBenefitSummary(input: {
    benefitType: string;
    percentValue?: Prisma.Decimal | null;
    maxDiscountAmount?: Prisma.Decimal | null;
  }) {
    if (input.benefitType === 'FREESHIP') {
      return 'Available voucher free shipping for your next order';
    }

    const percentValue = input.percentValue ? Number(input.percentValue) : 0;
    const maxDiscountAmount = input.maxDiscountAmount ? Number(input.maxDiscountAmount) : 0;
    return `Available voucher ${percentValue}%, max ${maxDiscountAmount.toLocaleString('vi-VN')} VND`;
  }

  private resolveRefundBenefitRule(refundAmount: Prisma.Decimal, shippingFee = 0): RefundBenefitRule {
    const minOrderValue = new Prisma.Decimal(REFUND_BENEFIT_MIN_ORDER_VALUE);

    if (refundAmount.lt(300000)) {
      const couponValue = new Prisma.Decimal(
        shippingFee > 0 ? shippingFee : DEFAULT_FREESHIP_COUPON_VALUE,
      );

      return {
        benefitType: 'FREESHIP',
        percentValue: null,
        maxDiscountAmount: null,
        minOrderValue,
        summary: 'Available voucher free shipping for your next order',
        couponType: 'FIXED_AMOUNT',
        couponValue,
        couponMaxDiscountAmount: null,
      };
    }

    if (refundAmount.lt(800000)) {
      return {
        benefitType: 'PERCENTAGE',
        percentValue: new Prisma.Decimal(10),
        maxDiscountAmount: new Prisma.Decimal(50000),
        minOrderValue,
        summary: 'Available voucher 10%, max 50,000 VND',
        couponType: 'PERCENTAGE',
        couponValue: new Prisma.Decimal(10),
        couponMaxDiscountAmount: new Prisma.Decimal(50000),
      };
    }

    if (refundAmount.lt(1500000)) {
      return {
        benefitType: 'PERCENTAGE',
        percentValue: new Prisma.Decimal(12),
        maxDiscountAmount: new Prisma.Decimal(80000),
        minOrderValue,
        summary: 'Available voucher 12%, max 80,000 VND',
        couponType: 'PERCENTAGE',
        couponValue: new Prisma.Decimal(12),
        couponMaxDiscountAmount: new Prisma.Decimal(80000),
      };
    }

    return {
      benefitType: 'PERCENTAGE',
      percentValue: new Prisma.Decimal(15),
      maxDiscountAmount: new Prisma.Decimal(120000),
      minOrderValue,
      summary: 'Available voucher 15%, max 120,000 VND',
      couponType: 'PERCENTAGE',
      couponValue: new Prisma.Decimal(15),
      couponMaxDiscountAmount: new Prisma.Decimal(120000),
    };
  }

  private buildRefundBenefitCouponCode(returnRequestId: number) {
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `RFB-${returnRequestId}-${randomSuffix}`;
  }

  private extractMimeTypeFromUrl(fileUrl: string) {
    const normalizedUrl = fileUrl.split('?')[0]?.toLowerCase() ?? '';
    if (normalizedUrl.endsWith('.png')) return 'image/png';
    if (normalizedUrl.endsWith('.webp')) return 'image/webp';
    if (normalizedUrl.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  private mapRefundBankInfo(value: Record<string, any>) {
    const latestSnapshot = Array.isArray(value.refundBankSnapshots) && value.refundBankSnapshots.length > 0
      ? (value.refundBankSnapshots[0] as BankSnapshotRecord)
      : null;
    const currentBankAccount = Array.isArray(value.user?.customerBankAccounts)
      ? (value.user.customerBankAccounts[0] as BankAccountRecord | undefined) ?? null
      : null;

    if (latestSnapshot) {
      return {
        available: true,
        bankAccountId: latestSnapshot.bankAccountId,
        bankName: latestSnapshot.bankName,
        bankCode: latestSnapshot.bankCode,
        accountNumber: null,
        accountNumberMasked: latestSnapshot.accountNumberMasked,
        accountHolder: latestSnapshot.accountHolder,
        qrImageUrl: latestSnapshot.qrImageUrl,
        inputMethod: latestSnapshot.inputMethod,
        updatedAt: latestSnapshot.capturedAt,
        source: 'SNAPSHOT',
      };
    }

    if (currentBankAccount) {
      return {
        available: true,
        bankAccountId: currentBankAccount.bankAccountId,
        bankName: currentBankAccount.bankName,
        bankCode: currentBankAccount.bankCode,
        accountNumber: currentBankAccount.accountNumber,
        accountNumberMasked: this.maskBankAccountNumber(currentBankAccount.accountNumber),
        accountHolder: currentBankAccount.accountHolder,
        qrImageUrl: currentBankAccount.qrImageUrl,
        inputMethod: currentBankAccount.inputMethod,
        updatedAt: currentBankAccount.updatedAt,
        source: currentBankAccount.isDefault ? 'DEFAULT_ACCOUNT' : 'ACCOUNT',
      };
    }

    return {
      available: false,
      bankAccountId: null,
      bankName: null,
      bankCode: null,
      accountNumber: null,
      accountNumberMasked: null,
      accountHolder: null,
      qrImageUrl: null,
      inputMethod: null,
      updatedAt: null,
      source: null,
    };
  }

  private mapRefundPayoutProofs(proofs: unknown) {
    if (!Array.isArray(proofs)) {
      return proofs;
    }

    return proofs.map((proof: any) => ({
      refundPayoutProofId: proof.refundPayoutProofId,
      refundTransactionId: proof.refundTransactionId ?? null,
      fileUrl: proof.fileUrl,
      fileName: proof.fileName ?? null,
      mimeType: proof.mimeType ?? null,
      note: proof.note ?? null,
      createdAt: proof.createdAt,
      uploadedBy: proof.uploadedByUser
        ? {
            userId: proof.uploadedByUser.userId,
            fullName: proof.uploadedByUser.fullName ?? '',
          }
        : null,
    }));
  }

  private mapRefundBenefit(value: Record<string, any>) {
    if (!Array.isArray(value.refundBenefits) || value.refundBenefits.length === 0) {
      return null;
    }

    const benefit = value.refundBenefits[0];
    return {
      refundBenefitId: benefit.refundBenefitId,
      benefitType: benefit.benefitType,
      percentValue: benefit.percentValue ? Number(benefit.percentValue) : null,
      maxDiscountAmount: benefit.maxDiscountAmount ? Number(benefit.maxDiscountAmount) : null,
      minOrderValue: Number(benefit.minOrderValue ?? 0),
      status: benefit.status,
      validFrom: benefit.validFrom,
      validUntil: benefit.validUntil,
      issuedAt: benefit.issuedAt ?? null,
      usedAt: benefit.usedAt ?? null,
      summary: this.formatRefundBenefitSummary(benefit),
      couponId: benefit.couponId ?? benefit.coupon?.couponId ?? null,
      couponSource: benefit.coupon?.source ?? null,
    };
  }

  private async resolveBankAccountForRefund(
    tx: ReturnTx,
    userId: number,
    selectedBankAccountId?: number,
  ) {
    if (selectedBankAccountId) {
      const selectedBankAccount = await tx.customerBankAccount.findFirst({
        where: {
          bankAccountId: selectedBankAccountId,
          userId,
          isActive: true,
        },
      });

      if (!selectedBankAccount) {
        throw new ServiceError('BANK_ACCOUNT_NOT_FOUND', 'Bank account not found', 404);
      }

      return selectedBankAccount;
    }

    return tx.customerBankAccount.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private async syncAcceptedRefundBankMarkers(
    tx: ReturnTx,
    params: { returnRequestId: number; userId: number; hasBankInfo: boolean },
  ) {
    const now = new Date();
    return tx.returnRequest.update({
      where: { returnRequestId: params.returnRequestId },
      data: {
        refundStatus: 'PENDING',
        ...(params.hasBankInfo
          ? {
              bankInfoSubmittedAt: now,
            }
          : {
              bankInfoRequestedAt: now,
            }),
      },
    });
  }

  private async sendAcceptedRefundEmail(record: {
    user?: { email?: string | null; fullName?: string | null } | null;
    order?: { orderNumber?: string | null } | null;
    bankInfo?: { available?: boolean } | null;
  }) {
    const email = record.user?.email?.trim();
    if (!email) {
      return;
    }

    const customerName = record.user?.fullName?.trim() || 'Customer';
    const orderNumber = record.order?.orderNumber?.trim() || 'your order';

    try {
      if (record.bankInfo?.available) {
        await sendRefundAcceptedAwaitingPayoutEmail(email, customerName, orderNumber);
      } else {
        await sendRefundAcceptedBankInfoRequiredEmail(
          email,
          customerName,
          orderNumber,
          PROFILE_BANK_LINK,
        );
      }
    } catch (error) {
      logger.warn('[ReturnRequestService] Failed to send refund accepted email', {
        error,
        email,
        orderNumber,
      });
    }
  }

  private async issueRefundBenefit(
    tx: ReturnTx,
    input: {
      returnRequestId: number;
      orderId: number;
      userId: number;
      refundAmount: Prisma.Decimal;
      shippingFee?: number;
    },
  ) {
    const existingBenefit = await tx.refundBenefit.findUnique({
      where: { returnRequestId: input.returnRequestId },
      include: {
        coupon: {
          select: {
            couponId: true,
            source: true,
          },
        },
      },
    });

    if (existingBenefit) {
      return {
        refundBenefitId: existingBenefit.refundBenefitId,
        issued: true,
        type: existingBenefit.benefitType,
        summary: this.formatRefundBenefitSummary(existingBenefit),
      };
    }

    const rule = this.resolveRefundBenefitRule(input.refundAmount, input.shippingFee ?? 0);
    const now = new Date();
    const validUntil = new Date(now.getTime() + REFUND_BENEFIT_VALID_DAYS * 24 * 60 * 60 * 1000);
    const coupon = await tx.coupon.create({
      data: {
        code: this.buildRefundBenefitCouponCode(input.returnRequestId),
        type: rule.couponType,
        value: rule.couponValue,
        maxDiscountAmount: rule.couponMaxDiscountAmount,
        minOrderValue: rule.minOrderValue,
        startDate: now,
        endDate: validUntil,
        usageLimit: 1,
        usagePerUser: 1,
        isActive: true,
        isHidden: true,
        source: 'REFUND_BENEFIT',
        visibleInPublicList: false,
      },
    });

    const createdBenefit = await tx.refundBenefit.create({
      data: {
        returnRequestId: input.returnRequestId,
        orderId: input.orderId,
        userId: input.userId,
        benefitType: rule.benefitType,
        percentValue: rule.percentValue,
        maxDiscountAmount: rule.maxDiscountAmount,
        minOrderValue: rule.minOrderValue,
        couponId: coupon.couponId,
        status: 'ACTIVE',
        validFrom: now,
        validUntil,
        issuedAt: now,
        usedAt: null,
        ruleVersion: 'refund-benefit-v1',
        source: 'REFUND',
        metadataJson: JSON.stringify({
          refundAmount: input.refundAmount.toNumber(),
          shippingFee: input.shippingFee ?? 0,
          couponType: rule.couponType,
        }),
      },
    });

    return {
      refundBenefitId: createdBenefit.refundBenefitId,
      issued: true,
      type: createdBenefit.benefitType,
      summary: rule.summary,
    };
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
    const bankInfo = this.mapRefundBankInfo(value);
    const refundPayoutProofs = this.mapRefundPayoutProofs(value.refundPayoutProofs);
    const refundBenefit = this.mapRefundBenefit(value);
    return {
      ...value,
      workflowStatus,
      statusBucket: this.bucketReturnStatus(workflowStatus),
      refundStatus: value.refundStatus ?? this.deriveRefundStatus(value),
      bankInfo,
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
      ...(typeof value.refundPayoutProofs !== 'undefined'
        ? { refundPayoutProofs }
        : {}),
      ...(refundBenefit ? { refundBenefit } : {}),
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

      const approvedForRefund = await prisma.$transaction(async (tx: ReturnTx) => {
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

        const bankAccount = await this.resolveBankAccountForRefund(tx, detail.userId);
        const now = new Date();

        const updated = await tx.returnRequest.update({
          where: { returnRequestId: id },
          data: {
            status: 'ACCEPTED_FOR_REFUND',
            refundStatus: 'PENDING',
            ...(bankAccount
              ? { bankInfoSubmittedAt: now }
              : { bankInfoRequestedAt: now }),
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

        return this.decorateReturnRecord({
          ...updated,
          user: detail.user,
          order: detail.order,
          refundBankSnapshots: detail.refundBankSnapshots ?? [],
          refundPayoutProofs: detail.refundPayoutProofs ?? [],
          refundBenefits: detail.refundBenefits ?? [],
          statusLogs: detail.statusLogs ?? [],
        });
      });

      await this.sendAcceptedRefundEmail(approvedForRefund as {
        user?: { email?: string | null; fullName?: string | null } | null;
        order?: { orderNumber?: string | null } | null;
        bankInfo?: { available?: boolean } | null;
      });

      return approvedForRefund;
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
    this.assertModernStorageAvailable(['returnRequest', 'returnRequestStatusLog']);

    const acceptedRecord = await prisma.$transaction(async (tx: ReturnTx) => {
      const current = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
      });
      if (!current) {
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
      }

      this.assertTransition(current.status, 'ACCEPTED_FOR_REFUND');

      const bankAccount = await this.resolveBankAccountForRefund(tx, current.userId);
      const now = new Date();
      const updated = await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: {
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          ...(bankAccount
            ? { bankInfoSubmittedAt: now }
            : { bankInfoRequestedAt: now }),
          updatedAt: now,
        },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: current.status,
          toStatus: 'ACCEPTED_FOR_REFUND',
          changedBy: actorId,
          comment: 'Return accepted for refund after receive and inspection',
        },
      });

      return updated;
    });

    const detail = await this.repo.findById(id);
    const decorated =
      detail ??
      this.decorateReturnRecord(acceptedRecord);

    await this.sendAcceptedRefundEmail(decorated as {
      user?: { email?: string | null; fullName?: string | null } | null;
      order?: { orderNumber?: string | null } | null;
      bankInfo?: { available?: boolean } | null;
    });

    return decorated;
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

  async uploadPayoutProofImage(actorId: number, payload: UploadPayoutProofImageDto) {
    if (!payload.imageData.startsWith('data:image/')) {
      throw new ServiceError('INVALID_PAYOUT_PROOF_FORMAT', 'Invalid payout proof image format', 400);
    }

    const mimeType = payload.imageData.split(';')[0]?.split(':')[1] ?? '';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new ServiceError('UNSUPPORTED_PAYOUT_PROOF_TYPE', 'Unsupported payout proof image type', 400);
    }

    const uploadResult = await cloudinaryService.uploadBase64(payload.imageData, {
      folder: `refund-payout-proofs/admin-${actorId}`,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });

    return {
      fileUrl: uploadResult.secureUrl,
      fileName: payload.fileName ?? null,
    };
  }

  async listRefundPayoutProofs(id: number) {
    this.assertModernStorageAvailable(['returnRequest', 'refundPayoutProof']);

    const request = await prisma.returnRequest.findUnique({
      where: { returnRequestId: id },
      select: {
        returnRequestId: true,
        refundPayoutProofs: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedByUser: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
    }

    return this.mapRefundPayoutProofs(request.refundPayoutProofs);
  }

  async sendBankInfoReminder(id: number, actorId: number) {
    this.assertModernStorageAvailable(['returnRequest', 'returnRequestStatusLog']);

    const request = await prisma.returnRequest.findUnique({
      where: { returnRequestId: id },
      select: {
        returnRequestId: true,
        status: true,
        userId: true,
        user: {
          select: {
            email: true,
            fullName: true,
            customerBankAccounts: {
              where: {
                isActive: true,
                isDefault: true,
              },
              select: {
                bankAccountId: true,
              },
              take: 1,
            },
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    if (!request) {
      throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
    }

    if (request.status !== 'ACCEPTED_FOR_REFUND') {
      throw new ServiceError(
        'INVALID_STATE_TRANSITION',
        'Reminder can only be sent for ACCEPTED_FOR_REFUND requests',
        409,
      );
    }

    const hasBankInfo = (request.user?.customerBankAccounts?.length ?? 0) > 0;
    if (hasBankInfo) {
      throw new ServiceError(
        'BANK_INFO_ALREADY_AVAILABLE',
        'Customer bank information is already available',
        409,
      );
    }

    await this.sendAcceptedRefundEmail({
      user: request.user,
      order: request.order,
      bankInfo: { available: false },
    });

    await prisma.returnRequestStatusLog.create({
      data: {
        returnRequestId: id,
        fromStatus: request.status,
        toStatus: request.status,
        changedBy: actorId,
        comment: 'Refund bank information reminder email sent',
        createdAt: new Date(),
      },
    });

    return { reminded: true as const };
  }

  async completeManualBankRefund(
    id: number,
    actorId: number,
    params: CompleteBankRefundDto,
  ) {
    this.assertModernStorageAvailable([
      'refundTransaction',
      'returnRequest',
      'returnRequestStatusLog',
      'refundBankSnapshot',
      'refundPayoutProof',
      'refundBenefit',
      'coupon',
    ]);

    const normalizedFinanceNote = params.financeNote?.trim() || null;

    const result = await prisma.$transaction(async (tx: ReturnTx) => {
      const request = await tx.returnRequest.findUnique({
        where: { returnRequestId: id },
        include: {
          order: {
            select: {
              orderId: true,
              orderNumber: true,
              shippingFee: true,
            },
          },
          user: {
            select: {
              userId: true,
              fullName: true,
              email: true,
            },
          },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
            },
          },
          refundTransactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!request) {
        throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
      }

      if (request.status !== 'ACCEPTED_FOR_REFUND') {
        throw new ServiceError(
          'INVALID_STATE_TRANSITION',
          'Refund can only be completed from ACCEPTED_FOR_REFUND',
          409,
        );
      }

      if (
        request.refundCompletedAt ||
        request.refundTransactions.some(
          (transaction) => this.normalizeRefundTransactionStatus(transaction.status) === 'COMPLETED',
        )
      ) {
        throw new ServiceError(
          'REFUND_ALREADY_COMPLETED',
          'This refund has already been completed',
          409,
        );
      }

      const bankAccount = await this.resolveBankAccountForRefund(
        tx,
        request.userId,
        params.selectedBankAccountId,
      );

      if (!bankAccount) {
        throw new ServiceError(
          'BANK_INFO_REQUIRED',
          'Customer bank information is required before completing refund',
          409,
        );
      }

      const refundableCap = this.resolveRefundableAmountCap(request);
      const amount = this.resolveRefundAmount(request, params.amount);
      const now = new Date();
      const transactionRef = params.transactionRef?.trim() || `BANK-${id}-${Date.now()}`;

      await tx.refundBankSnapshot.create({
        data: {
          returnRequestId: id,
          bankAccountId: bankAccount.bankAccountId,
          bankName: bankAccount.bankName,
          bankCode: bankAccount.bankCode,
          accountNumberMasked: this.maskBankAccountNumber(bankAccount.accountNumber),
          accountHolder: bankAccount.accountHolder,
          qrImageUrl: bankAccount.qrImageUrl,
          inputMethod: bankAccount.inputMethod,
          capturedAt: now,
        },
      });

      const refundRecord = await tx.refundTransaction.create({
        data: {
          returnRequestId: id,
          amount,
          method: 'BANK_TRANSFER',
          status: 'COMPLETED',
          idempotencyKey: `bank-refund-${id}`,
          transactionRef,
          processedBy: actorId,
        },
      });

      await tx.refundPayoutProof.createMany({
        data: params.proofImageUrls.map((fileUrl, index) => ({
          returnRequestId: id,
          refundTransactionId: refundRecord.refundTransactionId,
          uploadedBy: actorId,
          fileUrl,
          fileName: fileUrl.split('/').pop()?.split('?')[0] || `proof-${index + 1}.jpg`,
          mimeType: this.extractMimeTypeFromUrl(fileUrl),
          note: index === 0 ? normalizedFinanceNote : null,
        })),
      });

      if (normalizedFinanceNote) {
        await tx.returnRequestStatusLog.create({
          data: {
            returnRequestId: id,
            fromStatus: request.status,
            toStatus: request.status,
            changedBy: actorId,
            comment: normalizedFinanceNote,
            createdAt: now,
          },
        });
      }

      const refundStatus: RefundWorkflowStatus =
        amount.lt(refundableCap) ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

      await tx.returnRequest.update({
        where: { returnRequestId: id },
        data: {
          status: 'CLOSED',
          refundStatus,
          financeNote: normalizedFinanceNote,
          refundCompletedAt: now,
          updatedAt: now,
        },
      });

      await tx.returnRequestStatusLog.create({
        data: {
          returnRequestId: id,
          fromStatus: request.status,
          toStatus: 'CLOSED',
          changedBy: actorId,
          comment: `Đã hoàn tiền qua chuyển khoản ngân hàng - mã giao dịch ${transactionRef}`,
          createdAt: now,
        },
      });

      const benefit = await this.issueRefundBenefit(tx, {
        returnRequestId: id,
        orderId: request.orderId,
        userId: request.userId,
        refundAmount: amount,
        shippingFee: Number(request.order?.shippingFee ?? 0),
      });

      return {
        refundRecord,
        refundStatus,
        benefit,
        requestUser: request.user,
        requestOrder: request.order,
      };
    });

    notifyCustomer('RETURN_REFUNDED', {
      returnRequestId: id,
      orderId: result.requestOrder?.orderId ?? 0,
      refundAmount: Number(result.refundRecord.amount),
      refundMethod: result.refundRecord.method,
      customerEmail: result.requestUser?.email ?? undefined,
      customerName: result.requestUser?.fullName ?? undefined,
    });

    if (result.requestUser?.email) {
      await sendRefundCompletedBenefitIssuedEmail({
        email: result.requestUser.email,
        fullName: result.requestUser.fullName ?? 'Customer',
        orderNumber: result.requestOrder?.orderNumber ?? `#${result.requestOrder?.orderId ?? id}`,
        refundAmount: Number(result.refundRecord.amount),
        refundDate: new Date(),
        voucherSummary: result.benefit.summary,
        profileLink: PROFILE_VOUCHER_LINK,
      }).catch((error) => {
        logger.warn('[ReturnRequestService] Failed to send refund completed email', {
          error,
          returnRequestId: id,
        });
      });
    }

    return {
      refundTransactionId: result.refundRecord.refundTransactionId,
      refundStatus: result.refundStatus,
      benefit: {
        issued: result.benefit.issued,
        type: result.benefit.type,
        summary: result.benefit.summary,
      },
    };
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
