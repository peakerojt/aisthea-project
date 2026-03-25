import { describe, expect, it } from '@jest/globals';

import { ORDER_STATUS } from '../orderStatus.config';
import { FULFILLED_ORDER_REPORTING_STATUSES } from '../orderReporting.config';

describe('orderReporting.config', () => {
  it('keeps delivered reporting aliases in one shared list', () => {
    expect(FULFILLED_ORDER_REPORTING_STATUSES).toEqual([
      ORDER_STATUS.DELIVERED,
      'DELIVERED',
      'COMPLETED',
      'Completed',
    ]);
  });
});

