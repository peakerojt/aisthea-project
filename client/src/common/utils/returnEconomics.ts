import {
  resolveRefundTargetAmount,
  toNumericAmount,
} from '@/common/utils/returnAmounts';

export const resolveExpectedRefundEconomics = (record?: {
  refundableCapAmount?: string | number | null;
  totalRefundAmount?: string | number | null;
} | null) => {
  const refundableCapAmount = toNumericAmount(record?.refundableCapAmount);
  const legacyTotalRefundAmount = toNumericAmount(record?.totalRefundAmount);
  const hasRefundableCap =
    record?.refundableCapAmount != null && refundableCapAmount > 0;
  const expectedRefundAmount = resolveRefundTargetAmount(record);

  return {
    expectedRefundAmount,
    legacyTotalRefundAmount,
    hasRefundableCap,
    showsRefundCapAdjustment:
      hasRefundableCap &&
      legacyTotalRefundAmount > 0 &&
      expectedRefundAmount < legacyTotalRefundAmount,
  };
};

type ReturnEconomicsItemLike = {
  quantity?: number | null;
  unitPrice?: string | number | null;
  requestedRefundAmount?: string | number | null;
  orderItemGrossAmount?: string | number | null;
  orderItemAllocatedDiscountAmount?: string | number | null;
  orderItemNetPaidAmount?: string | number | null;
};

export const summarizeReturnItemEconomics = (
  items?: ReturnEconomicsItemLike[] | null,
) => {
  const normalizedItems = Array.isArray(items) ? items : [];

  const totalGrossAmount = normalizedItems.reduce(
    (sum, item) => sum + toNumericAmount(item.orderItemGrossAmount),
    0,
  );
  const totalDiscountAmount = normalizedItems.reduce(
    (sum, item) => sum + toNumericAmount(item.orderItemAllocatedDiscountAmount),
    0,
  );
  const totalNetPaidAmount = normalizedItems.reduce(
    (sum, item) => sum + toNumericAmount(item.orderItemNetPaidAmount),
    0,
  );
  const totalRequestedRefundAmount = normalizedItems.reduce((sum, item) => {
    const requestedRefundAmount = toNumericAmount(item.requestedRefundAmount);
    if (requestedRefundAmount > 0) {
      return sum + requestedRefundAmount;
    }

    const quantity = Number(item.quantity ?? 0);
    const unitPrice = toNumericAmount(item.unitPrice);
    return sum + unitPrice * quantity;
  }, 0);

  return {
    totalGrossAmount,
    totalDiscountAmount,
    totalNetPaidAmount,
    totalRequestedRefundAmount,
    hasSnapshotBreakdown:
      totalGrossAmount > 0 || totalDiscountAmount > 0 || totalNetPaidAmount > 0,
  };
};
