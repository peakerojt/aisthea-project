import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      i18nMode.rawKeys ? key : (options?.defaultValue ?? key),
  }),
}));

import { OrderHeader } from '@/common/components/OrderHeader';

describe('OrderHeader', () => {
  beforeEach(() => {
    i18nMode.rawKeys = false;
  });

  it('keeps header chrome readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <OrderHeader
        order={{
          orderId: 1,
          orderNumber: 'ORD-1',
          orderCode: 'ORD-1',
          status: 'RETURN_REQUESTED',
          paymentStatus: 'paid',
          paymentMethod: 'COD',
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
          items: [],
          timeline: [],
        }}
      />,
    );

    expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
    expect(screen.getByText('Ngày đặt')).toBeInTheDocument();
    expect(screen.getByText('Tổng tiền')).toBeInTheDocument();
    expect(screen.getByText(/Phương thức:/)).toBeInTheDocument();
  });

  it('renders canonical cancelled payment labels without falling back to failed wording', () => {
    render(
      <OrderHeader
        order={{
          orderId: 2,
          orderNumber: 'ORD-2',
          orderCode: 'ORD-2',
          status: 'PROCESSING',
          paymentStatus: 'canceled',
          paymentMethod: 'VNPAY',
          totalAmount: '259000',
          createdAt: '2026-02-24T08:00:00.000Z',
          shippingAddress: {
            recipientName: 'A',
            phone: '090',
            city: 'Da Nang',
            addressDetail: '123 Street',
          },
          pricing: {
            itemsTotal: 259000,
            shippingFee: 0,
            discount: 0,
            tax: 0,
            grandTotal: 259000,
          },
          items: [],
          timeline: [],
        }}
      />,
    );

    expect(screen.getByText('Đã hủy thanh toán')).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
  });

  it('renders canonical needs-review payment labels without collapsing to failed wording', () => {
    render(
      <OrderHeader
        order={{
          orderId: 3,
          orderNumber: 'ORD-3',
          orderCode: 'ORD-3',
          status: 'PROCESSING',
          paymentStatus: 'needs_review',
          paymentMethod: 'VNPAY',
          totalAmount: '359000',
          createdAt: '2026-02-24T08:00:00.000Z',
          shippingAddress: {
            recipientName: 'A',
            phone: '090',
            city: 'Da Nang',
            addressDetail: '123 Street',
          },
          pricing: {
            itemsTotal: 359000,
            shippingFee: 0,
            discount: 0,
            tax: 0,
            grandTotal: 359000,
          },
          items: [],
          timeline: [],
        }}
      />,
    );

    expect(screen.getByText('Cần kiểm tra thanh toán')).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
  });
});
