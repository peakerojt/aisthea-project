type PaymentTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type PaymentDisplayStatus =
  | 'COD_PENDING'
  | 'PENDING'
  | 'VERIFYING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'UNKNOWN';

export interface PaymentStatusMeta {
  canonicalStatus: PaymentDisplayStatus;
  labelKey: string;
  defaultLabel: string;
  badgeClass: string;
  textClass: string;
  isPaidLike: boolean;
}

interface PaymentMethodMeta {
  labelKey: string;
  defaultLabel: string;
}

const TONE_STYLES: Record<PaymentTone, { badgeClass: string; textClass: string }> = {
  success: {
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    textClass: 'text-emerald-400',
  },
  warning: {
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    textClass: 'text-amber-400',
  },
  danger: {
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    textClass: 'text-red-400',
  },
  info: {
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    textClass: 'text-blue-400',
  },
  neutral: {
    badgeClass: 'bg-white/5 text-white/70 border-white/10',
    textClass: 'text-white/60',
  },
};

const normalizeValue = (value?: string | null) =>
  (value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const normalizePaymentStatus = (status?: string | null): PaymentDisplayStatus | string => {
  const normalized = normalizeValue(status);

  switch (normalized) {
    case 'PAID':
    case 'COMPLETED':
    case 'SUCCESS':
      return 'PAID';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'PARTIALLY_REFUNDED':
    case 'PARTIAL_REFUND':
      return 'PARTIALLY_REFUNDED';
    case 'FAILED':
    case 'CANCELLED':
    case 'CANCELED':
    case 'DECLINED':
    case 'EXPIRED':
      return 'FAILED';
    case 'VERIFYING':
    case 'PROCESSING':
      return 'VERIFYING';
    case 'PENDING':
      return 'PENDING';
    case 'UNPAID':
    case 'NOT_PAID':
    case '':
      return 'UNPAID';
    default:
      return normalized;
  }
};

const normalizePaymentMethod = (method?: string | null) => normalizeValue(method);

export const getPaymentMethodMeta = (paymentMethod?: string | null): PaymentMethodMeta => {
  const method = normalizePaymentMethod(paymentMethod);

  switch (method) {
    case 'COD':
      return {
        labelKey: 'paymentMethod.COD',
        defaultLabel: 'Thanh toán khi nhận hàng',
      };
    case 'VNPAY':
      return {
        labelKey: 'paymentMethod.VNPAY',
        defaultLabel: 'VNPay',
      };
    case 'BANK_TRANSFER':
      return {
        labelKey: 'paymentMethod.BANK_TRANSFER',
        defaultLabel: 'Chuyển khoản ngân hàng',
      };
    case 'MOMO':
      return {
        labelKey: 'paymentMethod.MOMO',
        defaultLabel: 'Ví MoMo',
      };
    case 'ZALOPAY':
      return {
        labelKey: 'paymentMethod.ZALOPAY',
        defaultLabel: 'ZaloPay',
      };
    default:
      return {
        labelKey: `paymentMethod.${method || 'COD'}`,
        defaultLabel: paymentMethod || 'Thanh toán khi nhận hàng',
      };
  }
};

export const getPaymentStatusMeta = (
  paymentMethod?: string | null,
  paymentStatus?: string | null
): PaymentStatusMeta => {
  const method = normalizePaymentMethod(paymentMethod);
  const status = normalizePaymentStatus(paymentStatus);

  if (status === 'PAID') {
    return {
      canonicalStatus: 'PAID',
      labelKey: 'paymentStatus.PAID',
      defaultLabel: 'Đã thanh toán',
      ...TONE_STYLES.success,
      isPaidLike: true,
    };
  }

  if (status === 'REFUNDED') {
    return {
      canonicalStatus: 'REFUNDED',
      labelKey: 'paymentStatus.REFUNDED',
      defaultLabel: 'Đã hoàn tiền',
      ...TONE_STYLES.info,
      isPaidLike: false,
    };
  }

  if (status === 'PARTIALLY_REFUNDED') {
    return {
      canonicalStatus: 'PARTIALLY_REFUNDED',
      labelKey: 'paymentStatus.PARTIALLY_REFUNDED',
      defaultLabel: 'Hoàn tiền một phần',
      ...TONE_STYLES.info,
      isPaidLike: true,
    };
  }

  if (status === 'FAILED') {
    return {
      canonicalStatus: 'FAILED',
      labelKey: 'paymentStatus.FAILED',
      defaultLabel: 'Thanh toán thất bại',
      ...TONE_STYLES.danger,
      isPaidLike: false,
    };
  }

  if (method === 'COD') {
    return {
      canonicalStatus: 'COD_PENDING',
      labelKey: 'paymentStatus.COD_PENDING',
      defaultLabel: 'Chờ thanh toán',
      ...TONE_STYLES.neutral,
      isPaidLike: false,
    };
  }

  if (status === 'VERIFYING') {
    return {
      canonicalStatus: 'VERIFYING',
      labelKey: 'paymentStatus.VERIFYING',
      defaultLabel: 'Đang xác nhận thanh toán',
      ...TONE_STYLES.info,
      isPaidLike: false,
    };
  }

  if (status === 'PENDING' || status === 'UNPAID') {
    return {
      canonicalStatus: 'PENDING',
      labelKey: 'paymentStatus.PENDING',
      defaultLabel: 'Chờ thanh toán',
      ...TONE_STYLES.warning,
      isPaidLike: false,
    };
  }

  return {
    canonicalStatus: 'UNKNOWN',
    labelKey: 'paymentStatus.PENDING',
    defaultLabel: paymentStatus || 'Chờ thanh toán',
    ...TONE_STYLES.warning,
    isPaidLike: false,
  };
};
