import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (i18nMode.rawKeys) {
        return key;
      }

      const translations: Record<string, string> = {
        'paymentStatus.REFUNDED': 'Đã hoàn tiền',
        'paymentMethod.BANK_TRANSFER': 'Chuyển khoản ngân hàng',
      };

      return translations[key] ?? String(options?.defaultValue ?? key);
    },
  }),
}));

import { PaymentMethodLabel, PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';

describe('PaymentStatusBadge', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    i18nMode.rawKeys = false;
  });

  it('renders translated payment labels when enums translations are available', () => {
    render(
      <>
        <PaymentStatusBadge paymentMethod="VNPAY" paymentStatus="REFUNDED" />
        <PaymentMethodLabel paymentMethod="BANK_TRANSFER" />
      </>,
    );

    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Chuyển khoản ngân hàng')).toBeInTheDocument();
  });

  it('falls back to Vietnamese default labels when enums translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <>
        <PaymentStatusBadge paymentMethod="VNPAY" paymentStatus="REFUNDED" />
        <PaymentMethodLabel paymentMethod="BANK_TRANSFER" />
      </>,
    );

    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Chuyển khoản ngân hàng')).toBeInTheDocument();
  });
});
