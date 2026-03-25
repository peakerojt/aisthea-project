import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TrackingLookupPage } from '@/common/pages/TrackingLookupPage';

const publicTracking = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/common/services/tracking.service', () => ({
  publicTracking: (...args: any[]) => publicTracking(...args),
}));

describe('TrackingLookupPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders translated hero and validation copy', async () => {
    render(
      <MemoryRouter>
        <TrackingLookupPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Theo dõi đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Tra cứu')).toBeInTheDocument();
    expect(screen.getByText('vận đơn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại đơn hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem trạng thái' }));

    expect(await screen.findByText('Vui lòng nhập mã đơn hàng.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeInTheDocument();
    expect(publicTracking).not.toHaveBeenCalled();
  });
});
