import { getStatusMeta, ORDER_STATUS } from '@/config/orderStatus.config';
import { getOrderUiCanonicalStatus, getReturnRequestedStatusMeta, toCompactStatusKey } from '@/common/utils/orderUiStatus';

export const normalizeCustomerOrderStatus = (status: string | null | undefined) => {
  const canonicalStatus = getOrderUiCanonicalStatus(status);
  return canonicalStatus === 'RETURN_REQUESTED' ? null : canonicalStatus;
};

export const getCustomerOrderStatusMeta = (status: string | null | undefined) => {
  const canonicalStatus = getOrderUiCanonicalStatus(status);
  if (canonicalStatus && canonicalStatus !== 'RETURN_REQUESTED') return getStatusMeta(canonicalStatus);

  const compactStatus = toCompactStatusKey(status);
  if (compactStatus === 'RETURN_REQUESTED') return getReturnRequestedStatusMeta();

  return null;
};
