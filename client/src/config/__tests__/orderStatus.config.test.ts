import { describe, expect, it } from 'vitest';

import { normalizeStatus, ORDER_STATUS } from '@/config/orderStatus.config';

describe('orderStatus.config normalizeStatus', () => {
  it('normalizes canonical order statuses with casing and whitespace drift', () => {
    expect(normalizeStatus(' pending ')).toBe(ORDER_STATUS.PENDING);
    expect(normalizeStatus('shipping')).toBe(ORDER_STATUS.SHIPPING);
    expect(normalizeStatus('DELIVERED')).toBe(ORDER_STATUS.DELIVERED);
  });

  it('maps legacy canceled aliases to the canonical cancelled status', () => {
    expect(normalizeStatus('canceled')).toBe(ORDER_STATUS.CANCELLED);
    expect(normalizeStatus(' CANCELED ')).toBe(ORDER_STATUS.CANCELLED);
  });

  it('maps legacy completed aliases to the canonical delivered status', () => {
    expect(normalizeStatus('completed')).toBe(ORDER_STATUS.DELIVERED);
    expect(normalizeStatus(' COMPLETED ')).toBe(ORDER_STATUS.DELIVERED);
  });

  it('does not treat return-requested as an order FSM status', () => {
    expect(normalizeStatus('return-requested')).toBeNull();
    expect(normalizeStatus('RETURN_REQUESTED')).toBeNull();
  });
});
