import { ORDER_STATUS } from './orderStatus.config';

// Reporting queries still need to read a small set of legacy persisted aliases.
export const FULFILLED_ORDER_REPORTING_STATUSES = [
  ORDER_STATUS.DELIVERED,
  'DELIVERED',
  'COMPLETED',
  'Completed',
] as const;

