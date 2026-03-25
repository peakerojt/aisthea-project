import { describe, expect, it } from 'vitest';

import { formatCurrencyFullVND, formatCurrencyVND } from '@/common/utils/currency';

describe('currency utils', () => {
  it('formats plain VND values with the compact helper', () => {
    expect(formatCurrencyVND(125000)).toBe('125.000 đ');
    expect(formatCurrencyVND('98000')).toBe('98.000 đ');
    expect(formatCurrencyVND('oops')).toBe('0 đ');
  });

  it('formats full VND values with the currency helper', () => {
    expect(formatCurrencyFullVND(125000)).toMatch(/125\.000\s₫/);
    expect(formatCurrencyFullVND('98000')).toMatch(/98\.000\s₫/);
    expect(formatCurrencyFullVND('oops')).toMatch(/0\s₫/);
  });
});
