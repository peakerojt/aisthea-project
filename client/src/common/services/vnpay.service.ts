import { api } from '@/common/utils/api';
import { normalizeStatus, ORDER_STATUS } from '@/config/orderStatus.config';
import { getPaymentStatusMeta } from '@/common/utils/paymentStatus';

type VnpayPaymentUrlResponse = {
  vnpUrl?: string;
  data?: {
    vnpUrl?: string;
  };
};

export const getVnpayRedirectUrl = (response?: VnpayPaymentUrlResponse | null) =>
  response?.vnpUrl ?? response?.data?.vnpUrl;

export const createVnpayPaymentUrl = async (
  orderId: number,
  options?: {
    orderDescription?: string;
    orderType?: string;
  },
) => {
  const response = await api.post<VnpayPaymentUrlResponse>('/api/vnpay/create_payment_url', {
    orderId,
    orderDescription: options?.orderDescription ?? `Thanh toan don hang ${orderId}`,
    orderType: options?.orderType ?? 'other',
  });

  const vnpUrl = getVnpayRedirectUrl(response);
  if (!vnpUrl) {
    throw new Error('VNPAY_URL_MISSING');
  }

  return vnpUrl;
};

export const redirectToVnpayPayment = async (
  orderId: number,
  options?: {
    orderDescription?: string;
    orderType?: string;
  },
) => {
  const vnpUrl = await createVnpayPaymentUrl(orderId, options);
  window.location.href = vnpUrl;
  return vnpUrl;
};

export const canRetryVnpayPayment = ({
  orderStatus,
  paymentMethod,
  paymentStatus,
}: {
  orderStatus?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}) => {
  if ((paymentMethod ?? '').trim().toUpperCase() !== 'VNPAY') {
    return false;
  }

  if (normalizeStatus(orderStatus) !== ORDER_STATUS.PENDING) {
    return false;
  }

  const canonicalPaymentStatus = getPaymentStatusMeta(paymentMethod, paymentStatus).canonicalStatus;
  return ['PENDING_VNPAY', 'FAILED', 'CANCELLED'].includes(canonicalPaymentStatus);
};
