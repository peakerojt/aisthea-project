import React from 'react';
import { useTranslation } from 'react-i18next';
import { getPaymentMethodMeta, getPaymentStatusMeta } from '@/common/utils/paymentStatus';

interface PaymentStatusBadgeProps {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  uppercase?: boolean;
}

interface PaymentMethodLabelProps {
  paymentMethod?: string | null;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PaymentStatusBadgeProps['size']>, string> = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  paymentMethod,
  paymentStatus,
  size = 'sm',
  className = '',
  uppercase = false,
}) => {
  const { t } = useTranslation('enums');
  const meta = getPaymentStatusMeta(paymentMethod, paymentStatus);
  const label = t(meta.labelKey, { defaultValue: meta.defaultLabel });

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${SIZE_CLASSES[size]} ${uppercase ? 'uppercase tracking-wide' : ''} ${meta.badgeClass} ${className}`.trim()}
    >
      {label === meta.labelKey ? meta.defaultLabel : label}
    </span>
  );
};

export const PaymentMethodLabel: React.FC<PaymentMethodLabelProps> = ({
  paymentMethod,
  className = '',
}) => {
  const { t } = useTranslation('enums');
  const meta = getPaymentMethodMeta(paymentMethod);
  const label = t(meta.labelKey, { defaultValue: meta.defaultLabel });

  return (
    <span className={className}>
      {label === meta.labelKey ? meta.defaultLabel : label}
    </span>
  );
};
