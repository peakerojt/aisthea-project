import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ReturnItemList } from '@/store/components/return-detail/ReturnItemList';

describe('ReturnItemList', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders a single-item card without duplicate refund summary and supports image preview', async () => {
    render(
      <ReturnItemList
        items={[
          {
            orderItemId: 24,
            quantity: 2,
            unitPrice: 125000,
            requestedRefundAmount: 200000,
            orderItemGrossAmount: 250000,
            orderItemAllocatedDiscountAmount: 50000,
            orderItemNetPaidAmount: 200000,
            reason: 'DEFECTIVE',
            orderItem: {
              orderItemId: 24,
              productName: 'Áo hoodie',
              variantName: 'Đen / XL',
              thumbnailUrl: 'https://cdn.example.com/hoodie-thumb.jpg',
              imageUrl: 'https://cdn.example.com/hoodie-full.jpg',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('Áo hoodie')).toBeInTheDocument();
    expect(screen.getByText('Đen / XL')).toBeInTheDocument();
    expect(screen.getByText('SL trả')).toBeInTheDocument();
    expect(screen.getByText('Đơn giá')).toBeInTheDocument();
    expect(screen.getByText('Lý do')).toBeInTheDocument();
    expect(screen.getByText('Gốc')).toBeInTheDocument();
    expect(screen.getByText('Giảm giá')).toBeInTheDocument();
    expect(screen.getByText('Thực trả')).toBeInTheDocument();
    expect(screen.getAllByText('200.000đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('250.000đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50.000đ').length).toBeGreaterThan(0);
    expect(screen.queryByText('Hoàn dự kiến')).not.toBeInTheDocument();
    expect(screen.queryByText('Tổng hoàn dự kiến:')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ảnh sản phẩm Áo hoodie' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/hoodie-thumb.jpg',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh sản phẩm Áo hoodie' }));

    expect(screen.getByRole('dialog', { name: 'Xem ảnh sản phẩm' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog', { name: 'Xem ảnh sản phẩm' })).getByRole('img', {
        name: 'Ảnh sản phẩm Áo hoodie',
      }),
    ).toHaveAttribute('src', 'https://cdn.example.com/hoodie-full.jpg');

    await userEvent.click(screen.getByRole('button', { name: 'Đóng xem ảnh sản phẩm' }));

    expect(screen.queryByRole('dialog', { name: 'Xem ảnh sản phẩm' })).not.toBeInTheDocument();
  });

  it('renders a footer summary only when multiple items are returned', () => {
    render(
      <ReturnItemList
        items={[
          {
            orderItemId: 24,
            quantity: 1,
            unitPrice: 125000,
            requestedRefundAmount: 100000,
            orderItemGrossAmount: 125000,
            orderItemAllocatedDiscountAmount: 25000,
            orderItemNetPaidAmount: 100000,
            reason: 'DEFECTIVE',
            orderItem: {
              orderItemId: 24,
              productName: 'Áo hoodie',
              variantName: 'Đen / XL',
            },
          },
          {
            orderItemId: 25,
            quantity: 1,
            unitPrice: 70000,
            requestedRefundAmount: 70000,
            orderItemGrossAmount: 70000,
            orderItemAllocatedDiscountAmount: 0,
            orderItemNetPaidAmount: 70000,
            reason: 'WRONG_ITEM',
            orderItem: {
              orderItemId: 25,
              productName: 'Áo thun',
              variantName: 'Trắng / M',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('Tổng hoàn dự kiến:')).toBeInTheDocument();
    expect(screen.getByText('Tổng giá gốc')).toBeInTheDocument();
    expect(screen.getByText('Tổng giảm giá phân bổ')).toBeInTheDocument();
    expect(screen.getByText('Tổng thực trả')).toBeInTheDocument();
    expect(screen.getAllByText('170.000đ').length).toBeGreaterThan(1);
    expect(screen.getByText('195.000đ')).toBeInTheDocument();
  });

  it('renders item-specific notes and attachments when present', () => {
    render(
      <ReturnItemList
        items={[
          {
            returnRequestItemId: 30,
            orderItemId: 26,
            quantity: 1,
            unitPrice: 50000,
            requestedRefundAmount: 50000,
            reason: 'WRONG_ITEM',
            reasonText: 'Nhận nhầm màu xanh thay vì màu đen',
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

    expect(screen.getByText(/Ghi chú/)).toBeInTheDocument();
    expect(screen.getByText('Nhận nhầm màu xanh thay vì màu đen')).toBeInTheDocument();
    expect(screen.getByText('Ảnh đính kèm')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ảnh sản phẩm trả 1' })).toHaveAttribute(
      'href',
      'https://example.com/item-proof-26.jpg',
    );
  });

  it('shows an empty state when there are no items', () => {
    render(<ReturnItemList items={[]} />);

    expect(screen.getByText('Không có sản phẩm.')).toBeInTheDocument();
  });
});
