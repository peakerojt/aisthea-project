import { getStatusMeta, normalizeStatus, ORDER_STATUS, type StatusMeta } from '@/config/orderStatus.config';

export const toCompactStatusKey = (status: string | null | undefined) =>
  status?.trim().replace(/[\s-]+/g, '_').toUpperCase() ?? '';

export const getOrderUiCanonicalStatus = (status: string | null | undefined) => {
  const compactStatus = toCompactStatusKey(status);

  if (compactStatus === 'RETURN_REQUESTED') {
    return 'RETURN_REQUESTED' as const;
  }

  if (compactStatus === 'CANCELED') {
    return ORDER_STATUS.CANCELLED;
  }

  return normalizeStatus(status?.trim());
};

export const getReturnRequestedStatusMeta = (): StatusMeta => ({
  ...getStatusMeta(ORDER_STATUS.RETURNED),
  label: 'Yêu cầu trả hàng',
  isTerminal: false,
  requiresNote: true,
});

export const getOrderStatusDisplayMeta = (status: string | null | undefined) => {
  const canonicalStatus = getOrderUiCanonicalStatus(status);

  if (canonicalStatus === 'RETURN_REQUESTED') {
    return {
      canonical: 'RETURN_REQUESTED',
      meta: getReturnRequestedStatusMeta(),
    };
  }

  const canonical = canonicalStatus ?? status ?? '';
  return {
    canonical,
    meta: getStatusMeta(canonical),
  };
};
