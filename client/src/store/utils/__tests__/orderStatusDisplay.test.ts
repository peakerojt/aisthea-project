import { describe, expect, it } from 'vitest';

import { getCustomerOrderStatusMeta, normalizeCustomerOrderStatus } from '@/store/utils/orderStatusDisplay';
import { ORDER_STATUS } from '@/config/orderStatus.config';

describe('orderStatusDisplay', () => {
  it('normalizes drifted canceled aliases for customer order history surfaces', () => {
    expect(normalizeCustomerOrderStatus(' canceled ')).toBe(ORDER_STATUS.CANCELLED);
  });

  it('normalizes legacy completed aliases for customer order history surfaces', () => {
    expect(normalizeCustomerOrderStatus(' completed ')).toBe(ORDER_STATUS.DELIVERED);
  });

  it('keeps return-requested readable without treating it as an order FSM status', () => {
    expect(normalizeCustomerOrderStatus(' return-requested ')).toBeNull();
    expect(getCustomerOrderStatusMeta(' return-requested ')).toEqual(
      expect.objectContaining({
        label: 'Yêu cầu trả hàng',
        isTerminal: false,
      }),
    );
  });
});
