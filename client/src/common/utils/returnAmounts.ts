export const toNumericAmount = (value: string | number | null | undefined) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveRefundTargetAmount = (record?: {
  refundableCapAmount?: string | number | null;
  totalRefundAmount?: string | number | null;
} | null) => toNumericAmount(record?.refundableCapAmount ?? record?.totalRefundAmount);
