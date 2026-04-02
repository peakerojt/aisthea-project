import { describe, expect, it } from 'vitest';

import {
  getRefundTransactionMethodLabel,
  normalizeRefundTransactionMethod,
} from '@/common/services/return.refund-transaction';

describe('return refund transaction helpers', () => {
  it('normalizes legacy refund gateway aliases to canonical methods', () => {
    expect(normalizeRefundTransactionMethod('original_gateway')).toBe('ORIGINAL_PAYMENT');
    expect(normalizeRefundTransactionMethod('store-wallet')).toBe('WALLET_CREDIT');
    expect(normalizeRefundTransactionMethod('bank transfer')).toBe('BANK_TRANSFER');
  });

  it('returns translated labels for normalized refund methods', () => {
    const resolveText = (key: string, fallback: string) =>
      ({
        'detail.refundOriginal': 'Hoàn về phương thức gốc',
        'detail.refundWallet': 'Ví điện tử',
        'detail.refundBankTransfer': 'Chuyển khoản ngân hàng',
      }[key] ?? fallback);

    expect(getRefundTransactionMethodLabel('ORIGINAL_GATEWAY', resolveText)).toBe(
      'Hoàn về phương thức gốc',
    );
    expect(getRefundTransactionMethodLabel('STORE_WALLET', resolveText)).toBe('Ví điện tử');
    expect(getRefundTransactionMethodLabel('BANK_TRANSFER', resolveText)).toBe(
      'Chuyển khoản ngân hàng',
    );
  });
});
