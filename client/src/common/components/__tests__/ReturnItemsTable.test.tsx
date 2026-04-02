import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ReturnItemsTable } from '@/common/components/ReturnItemsTable';

describe('ReturnItemsTable', () => {
  beforeEach(() => {
    cleanup();
  });

  it('uses readable fallbacks when return translations are unavailable', () => {
    render(
      <ReturnItemsTable
        items={[
          {
            orderItemId: 24,
            quantity: 2,
            unitPrice: 125000,
            reason: 'DEFECTIVE',
          },
        ]}
      />,
    );

    expect(screen.getAllByText('Sản phẩm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SL trả').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đơn giá').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thành tiền').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lý do').length).toBeGreaterThan(0);
    expect(screen.getByText('Sản phẩm #24')).toBeInTheDocument();
    expect(screen.getByText('DEFECTIVE')).toBeInTheDocument();
    expect(screen.getByText('Tổng hoàn dự kiến:')).toBeInTheDocument();
  });

  it('renders refund economics breakdown when snapshot amounts are available', () => {
    render(
      <ReturnItemsTable
        items={[
          {
            orderItemId: 25,
            quantity: 1,
            unitPrice: 80000,
            requestedRefundAmount: 80000,
            orderItemGrossAmount: 100000,
            orderItemAllocatedDiscountAmount: 20000,
            orderItemNetPaidAmount: 80000,
            reason: 'DEFECTIVE',
          },
        ]}
      />,
    );

    expect(screen.getByText(/Gốc/)).toBeInTheDocument();
    expect(screen.getByText(/Giảm giá/)).toBeInTheDocument();
    expect(screen.getByText(/Thực trả/)).toBeInTheDocument();
    expect(screen.getByText(/Hoàn yêu cầu/)).toBeInTheDocument();
    expect(screen.getAllByText('80.000đ')).not.toHaveLength(0);
    expect(screen.getAllByText('100.000đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20.000đ').length).toBeGreaterThan(0);
    expect(screen.getByText('Tổng giá gốc')).toBeInTheDocument();
    expect(screen.getByText('Tổng giảm giá phân bổ')).toBeInTheDocument();
    expect(screen.getByText('Tổng thực trả')).toBeInTheDocument();
  });

  it('renders item-specific reason notes when provided', () => {
    render(
      <ReturnItemsTable
        items={[
          {
            orderItemId: 29,
            quantity: 1,
            unitPrice: 90000,
            reason: 'WRONG_ITEM',
            reasonText: 'Nhận nhầm màu xanh thay vì màu đen',
          },
        ]}
      />,
    );

    expect(screen.getByText('WRONG_ITEM')).toBeInTheDocument();
    expect(screen.getByText(/Ghi chú/)).toBeInTheDocument();
    expect(screen.getByText('Nhận nhầm màu xanh thay vì màu đen')).toBeInTheDocument();
  });

  it('renders item-level attachment thumbnails when attachments are present', () => {
    render(
      <ReturnItemsTable
        items={[
          {
            returnRequestItemId: 30,
            orderItemId: 26,
            quantity: 1,
            unitPrice: 50000,
            reason: 'WRONG_ITEM',
            attachments: [
              {
                attachmentId: 2,
                returnRequestItemId: 30,
                fileUrl: 'https://example.com/item-proof-26.jpg',
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('Ảnh đính kèm')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ảnh sản phẩm trả 1' })).toHaveAttribute(
      'href',
      'https://example.com/item-proof-26.jpg',
    );
  });
});
