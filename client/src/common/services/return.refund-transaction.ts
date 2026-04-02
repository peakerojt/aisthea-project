export const normalizeRefundTransactionMethod = (method?: string | null) => {
  const normalized = String(method ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  if (normalized === 'ORIGINAL_PAYMENT' || normalized === 'ORIGINAL_GATEWAY') {
    return 'ORIGINAL_PAYMENT';
  }

  if (normalized === 'WALLET_CREDIT' || normalized === 'STORE_WALLET') {
    return 'WALLET_CREDIT';
  }

  if (normalized === 'BANK_TRANSFER') {
    return 'BANK_TRANSFER';
  }

  return normalized;
};

export const getRefundTransactionMethodLabel = (
  method: string | null | undefined,
  resolveText: (key: string, fallback: string) => string,
) => {
  const normalizedMethod = normalizeRefundTransactionMethod(method);

  switch (normalizedMethod) {
    case 'ORIGINAL_PAYMENT':
      return resolveText('detail.refundOriginal', 'Hoàn về phương thức gốc');
    case 'WALLET_CREDIT':
      return resolveText('detail.refundWallet', 'Ví điện tử');
    case 'BANK_TRANSFER':
      return resolveText('detail.refundBankTransfer', 'Chuyển khoản ngân hàng');
    default:
      return normalizedMethod || resolveText('detail.refundOriginal', 'Hoàn về phương thức gốc');
  }
};
