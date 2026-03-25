import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/admin/components/AdminUI', () => ({
  AdminBadge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminPageHeader: ({
    eyebrow,
    title,
    subtitle,
    meta,
    actions,
  }: {
    eyebrow: React.ReactNode;
    title: React.ReactNode;
    subtitle: React.ReactNode;
    meta: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div>{eyebrow}</div>
      <div>{title}</div>
      <div>{subtitle}</div>
      <div>{meta}</div>
      <div>{actions}</div>
    </div>
  ),
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminPrimaryButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AdminSecondaryButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  adminUiTokens: {
    labelText: 'label-text',
  },
}));

import { Tracking } from '@/admin/pages/Tracking';

describe('Tracking admin page', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders fallback-safe tracking labels', () => {
    render(<Tracking />);

    expect(screen.getAllByText('Theo dõi trực tiếp').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Đơn #29384')).toBeInTheDocument();
    expect(screen.getAllByText('Đơn hàng đang di chuyển đến điểm tiếp theo').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Dự kiến giao: Hôm nay, 18:00')).toBeInTheDocument();
    expect(screen.getByText('Saint Laurent Medium Bag')).toBeInTheDocument();
    expect(screen.getByText('Da đen • SL: 1')).toBeInTheDocument();
    expect(screen.getByText('Đã xuất kho')).toBeInTheDocument();
    expect(screen.getByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hỗ trợ' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]).toBeInTheDocument();
  });
});
