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
    expect(screen.queryByText('từ Chờ duyệt')).not.toBeInTheDocument();
    expect(screen.getByText('Yêu cầu trả hàng đã được duyệt.')).toBeInTheDocument();
    expect(screen.getByText('bởi Admin A')).toBeInTheDocument();
    expect(screen.getByText(/20\/3\/2026/)).toBeInTheDocument();
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

  it('canonicalizes legacy workflow aliases in timeline badges and labels', () => {
    render(
      <ReturnTimeline
        logs={[
          {
            logId: 5,
            fromStatus: 'PENDING_APPROVAL',
            toStatus: 'COMPLETED',
            createdAt: '2026-03-22T08:30:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã đóng')).toBeInTheDocument();
    expect(screen.queryByText('từ Chờ duyệt')).not.toBeInTheDocument();
  });

  it('renders raw Phase 5 workflow checkpoints from preserved workflow log fields', () => {
    render(
      <ReturnTimeline
        logs={[
          {
            logId: 3,
            fromStatus: 'APPROVED',
            toStatus: 'APPROVED',
            fromWorkflowStatus: 'IN_RETURN_TRANSIT',
            toWorkflowStatus: 'RECEIVED_AND_INSPECTING',
            createdAt: '2026-03-21T08:30:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã nhận và đang kiểm tra')).toBeInTheDocument();
    expect(screen.queryByText('từ Đang hoàn về kho')).not.toBeInTheDocument();
  });

  it('canonicalizes legacy workflow aliases even when preserved workflow fields are present', () => {
    render(
      <ReturnTimeline
        logs={[
          {
            logId: 6,
            fromStatus: 'APPROVED',
            toStatus: 'COMPLETED',
            fromWorkflowStatus: 'PENDING_APPROVAL',
            toWorkflowStatus: 'COMPLETED',
            createdAt: '2026-03-22T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã đóng')).toBeInTheDocument();
    expect(screen.queryByText('từ Chờ duyệt')).not.toBeInTheDocument();
  });

  it('renders finance updates as explicit timeline events', () => {
    render(
      <ReturnTimeline
        logs={[
          {
            logId: 4,
            fromStatus: 'ACCEPTED_FOR_REFUND',
            toStatus: 'ACCEPTED_FOR_REFUND',
            fromWorkflowStatus: 'ACCEPTED_FOR_REFUND',
            toWorkflowStatus: 'ACCEPTED_FOR_REFUND',
            comment: 'Cần đối soát lại giao dịch hoàn tiền.',
            createdAt: '2026-03-21T09:00:00.000Z',
            changedByUser: { fullName: 'Finance Ops' },
          },
        ]}
      />,
    );

    expect(screen.getByText('Bộ phận hoàn tiền đã cập nhật')).toBeInTheDocument();
    expect(screen.getByText('Cần đối soát lại giao dịch hoàn tiền.')).toBeInTheDocument();
    expect(screen.getByText('bởi Finance Ops')).toBeInTheDocument();
  });
});
