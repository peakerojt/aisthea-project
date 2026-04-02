import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { StatusBadge } from '@/common/components/StatusBadge';

describe('StatusBadge', () => {
  beforeEach(() => {
    cleanup();
  });

  it('normalizes legacy return aliases before rendering the label', () => {
    render(
      <>
        <StatusBadge status="PENDING_APPROVAL" />
        <StatusBadge status="COMPLETED" />
      </>,
    );

    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('Đã đóng')).toBeInTheDocument();
  });

  it('falls back to the raw status for non-return statuses', () => {
    render(<StatusBadge status="SHIPPING" />);

    expect(screen.getByText('SHIPPING')).toBeInTheDocument();
  });

  it('normalizes canceled aliases before rendering the label', () => {
    render(<StatusBadge status=" canceled " />);

    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByText(' canceled ')).not.toBeInTheDocument();
  });

  it('renders return requested tracking labels canonically', () => {
    render(<StatusBadge status="return-requested" />);

    expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
    expect(screen.queryByText('return-requested')).not.toBeInTheDocument();
  });

  it('prefers exact Phase 5 workflow labels when available', () => {
    render(
      <>
        <StatusBadge status="IN_RETURN_TRANSIT" />
        <StatusBadge status="RECEIVED_AND_INSPECTING" />
        <StatusBadge status="ACCEPTED_FOR_REFUND" />
      </>,
    );

    expect(screen.getByText('Đang hoàn về kho')).toBeInTheDocument();
    expect(screen.getByText('Đã nhận và đang kiểm tra')).toBeInTheDocument();
    expect(screen.getByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
  });
});
