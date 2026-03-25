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
    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument();
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
});
