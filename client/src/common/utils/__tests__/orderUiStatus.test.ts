import { describe, expect, it } from 'vitest';

import { getOrderStatusDisplayMeta, getOrderUiCanonicalStatus, getReturnRequestedStatusMeta, toCompactStatusKey } from '@/common/utils/orderUiStatus';
import { ORDER_STATUS } from '@/config/orderStatus.config';

describe('orderUiStatus', () => {
  it('normalizes compact keys with spacing and hyphen drift', () => {
    expect(toCompactStatusKey(' return-requested ')).toBe('RETURN_REQUESTED');
    expect(toCompactStatusKey(' completed ')).toBe('COMPLETED');
  });

  it('canonicalizes canceled and completed aliases for order UI surfaces', () => {
    expect(getOrderUiCanonicalStatus(' canceled ')).toBe(ORDER_STATUS.CANCELLED);
    expect(getOrderUiCanonicalStatus(' completed ')).toBe(ORDER_STATUS.DELIVERED);
  });

  it('keeps return-requested readable as a special UI status', () => {
    expect(getOrderUiCanonicalStatus(' return-requested ')).toBe('RETURN_REQUESTED');
  });

  it('returns shared display meta for return-requested UI states', () => {
    expect(getReturnRequestedStatusMeta()).toEqual(
      expect.objectContaining({
        label: 'Yêu cầu trả hàng',
        badgeClass: 'border-orange-500/30 bg-orange-500/10',
        isTerminal: false,
        requiresNote: true,
      }),
    );
  });

  it('builds shared display meta for delivered and return-requested aliases', () => {
    expect(getOrderStatusDisplayMeta(' completed ')).toEqual(
      expect.objectContaining({
        canonical: ORDER_STATUS.DELIVERED,
        meta: expect.objectContaining({
          label: 'Đã giao hàng',
        }),
      }),
    );

    expect(getOrderStatusDisplayMeta('return-requested')).toEqual(
      expect.objectContaining({
        canonical: 'RETURN_REQUESTED',
        meta: expect.objectContaining({
          label: 'Yêu cầu trả hàng',
        }),
      }),
    );
  });
});
