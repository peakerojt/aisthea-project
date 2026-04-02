import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      i18nMode.rawKeys ? key : (options?.defaultValue ?? key),
  }),
}));

import { ShippingAddressCard } from '@/common/components/ShippingAddressCard';

describe('ShippingAddressCard', () => {
  beforeEach(() => {
    i18nMode.rawKeys = false;
  });

  it('keeps the shipping-address heading readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <ShippingAddressCard
        order={{
          id: '11',
          orderCode: 'ORD-20260011',
          status: 'RETURN_REQUESTED',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
          shippingAddress: {
            recipientName: 'Nguyen Van A',
            recipientPhone: '0909000999',
            addressLine: '123 Le Loi',
            ward: 'Ben Nghe',
            district: 'Quan 1',
            city: 'TP.HCM',
          },
          items: [],
          pricing: {
            itemsTotal: 100000,
            shippingFee: 0,
            discount: 0,
            tax: 0,
            grandTotal: 100000,
          },
          timeline: [{ status: 'RETURN_REQUESTED', at: '2026-02-24T08:00:00.000Z' }],
          note: null,
        }}
      />,
    );

    expect(screen.getByText('Địa chỉ giao hàng')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
  });
});
