import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { z } from 'zod';
import { RefundDialog } from '@/admin/components/RefundDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/admin/services/refund.service', () => ({
  adminRefundService: {
    create: vi.fn(),
  },
  REFUND_METHODS: ['ORIGINAL_GATEWAY', 'BANK_TRANSFER', 'STORE_WALLET'],
  RefundRequestSchema: z.object({
    type: z.enum(['FULL', 'PARTIAL']),
    method: z.enum(['ORIGINAL_GATEWAY', 'BANK_TRANSFER', 'STORE_WALLET']),
    amount: z.number(),
    reason: z.string(),
  }),
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminModalShell: ({
    title,
    subtitle,
    children,
    footer,
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{children}</div>
      <div>{footer}</div>
    </section>
  ),
  AdminPrimaryButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AdminSecondaryButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

describe('RefundDialog', () => {
  it('renders fallback-safe refund dialog chrome', () => {
    render(
      <RefundDialog
        orderId={42}
        totalPaid={100000}
        existingRefunds={[]}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng #42')).toBeInTheDocument();
    expect(screen.getByText('Tổng đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn')).toBeInTheDocument();
    expect(screen.getByText('Tối đa có thể hoàn')).toBeInTheDocument();
    expect(screen.getByText('Loại hoàn tiền')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoàn toàn bộ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoàn một phần' })).toBeInTheDocument();
    expect(screen.getByText('Phương thức')).toBeInTheDocument();
    expect(screen.getByText('Lý do hoàn tiền')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mô tả lý do hoàn tiền...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xác nhận hoàn tiền 100.000 ₫' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hoàn qua cổng thanh toán gốc' })).toBeInTheDocument();
  });
});
