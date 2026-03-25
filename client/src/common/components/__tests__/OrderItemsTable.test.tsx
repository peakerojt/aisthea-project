import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      i18nMode.rawKeys ? key : (options?.defaultValue ?? key),
  }),
}));

import { OrderItemsTable } from '@/common/components/OrderItemsTable';

describe('OrderItemsTable', () => {
  beforeEach(() => {
    i18nMode.rawKeys = false;
  });

  it('keeps item chrome and review labels readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <OrderItemsTable
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
            discount: 0,
            tax: 0,
            grandTotal: 199000,
          },
          items: [
            {
              orderItemId: 1,
              productId: '10',
              productName: 'Ao thun',
              sku: 'SKU-RED-M',
              variantName: 'Do / M',
              unitPrice: '199000',
              price: 199000,
              quantity: 1,
              lineTotal: '199000',
              subtotal: 199000,
              isReviewed: false,
            },
          ],
          timeline: [],
        }}
        onReview={vi.fn()}
      />,
    );

    expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('1 món')).toBeInTheDocument();
    expect(screen.getByText(/SKU:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đánh giá' })).toBeInTheDocument();
  });
});
