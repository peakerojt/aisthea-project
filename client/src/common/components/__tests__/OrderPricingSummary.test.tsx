import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      i18nMode.rawKeys ? key : (options?.defaultValue ?? key),
  }),
}));

import { OrderPricingSummary } from '@/common/components/OrderPricingSummary';

describe('OrderPricingSummary', () => {
  beforeEach(() => {
    cleanup();
    i18nMode.rawKeys = false;
  });

  it('keeps pricing labels readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <OrderPricingSummary
        order={{
          orderId: 1,
          orderNumber: 'ORD-1',
          status: 'Delivered',
          paymentStatus: 'paid',
          totalAmount: '199000',
          createdAt: '2026-02-24T08:00:00.000Z',
          shippingAddress: {
            recipientName: 'A',
            phone: '090',
            city: 'Da Nang',
            addressDetail: '123 Street',
          },
          pricing: {
            itemsTotal: 199000,
            shippingFee: 0,
            discount: 10000,
            tax: 0,
            grandTotal: 189000,
          },
          items: [],
          timeline: [],
        }}
      />,
    );

    expect(screen.getByText('Tổng kết')).toBeInTheDocument();
    expect(screen.getByText('Tạm tính')).toBeInTheDocument();
    expect(screen.getByText('Tổng cộng')).toBeInTheDocument();
  });
});
