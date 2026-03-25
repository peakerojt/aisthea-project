import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ReturnTimeline } from '@/common/components/ReturnTimeline';

describe('ReturnTimeline', () => {
  it('renders readable fallbacks for empty state and known log copy', () => {
    const { rerender } = render(<ReturnTimeline logs={[]} />);

    expect(screen.getByText('Chưa có lịch sử trạng thái.')).toBeInTheDocument();

    rerender(
      <ReturnTimeline
        logs={[
          {
            logId: 1,
            fromStatus: 'PENDING_APPROVAL',
            toStatus: 'APPROVED',
            comment: 'Return request approved.',
            createdAt: '2026-03-20T08:30:00.000Z',
            changedByUser: { fullName: 'Admin A' },
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    expect(screen.getByText('từ Chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('Yêu cầu trả hàng đã được duyệt.')).toBeInTheDocument();
    expect(screen.getByText('bởi Admin A')).toBeInTheDocument();
  });

  it('translates the legacy customer-created comment instead of showing English copy', () => {
    render(
      <ReturnTimeline
        logs={[
          {
            logId: 2,
            toStatus: 'PENDING_APPROVAL',
            comment: 'Customer created return request',
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Khách hàng đã gửi yêu cầu trả hàng.')).toBeInTheDocument();
    expect(screen.queryByText('Customer created return request')).not.toBeInTheDocument();
  });
});
