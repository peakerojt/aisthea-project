import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderTimeline, TrackingTimeline } from '@/admin/components/OrderTimeline';

const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: (namespace?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (i18nMode.rawKeys) {
        return key;
      }

      const translations: Record<string, string> = {
        'timeline.empty': namespace === 'tracking' ? 'Chưa có lịch sử vận chuyển.' : 'Chưa có lịch sử trạng thái.',
      };

      return translations[key] ?? String(options?.defaultValue ?? key);
    },
  }),
}));

describe('OrderTimeline', () => {
  afterEach(() => {
    i18nMode.rawKeys = false;
    cleanup();
  });

  it('renders the timeline list when history entries exist', () => {
    render(
      <OrderTimeline
        history={[
          { status: 'PENDING', changedAt: new Date().toISOString(), note: 'created' },
          { status: 'CONFIRMED', changedAt: new Date().toISOString(), note: 'ok' },
        ] as any}
      />,
    );

    expect(screen.getByLabelText('order-timeline')).toBeInTheDocument();
  });

  it('renders the empty state when no history exists', () => {
    render(<OrderTimeline history={[]} />);
    expect(screen.getByText(/Chưa có lịch sử trạng thái/i)).toBeInTheDocument();
  });

  it('renders return requested with the correct fallback label', () => {
    render(
      <OrderTimeline
        history={[
          { status: 'RETURN_REQUESTED', changedAt: new Date().toISOString() },
        ]}
      />,
    );

    expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
  });

  it('keeps admin and tracking empty states readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <>
        <OrderTimeline history={[]} />
        <TrackingTimeline timeline={[]} />
      </>,
    );

    expect(screen.getByText('Chưa có lịch sử trạng thái.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có lịch sử vận chuyển.')).toBeInTheDocument();
  });
});
