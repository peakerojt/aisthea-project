import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderTimeline } from '../OrderTimeline';

describe('OrderTimeline', () => {
  it('render timeline', () => {
    render(
      <OrderTimeline
        timeline={[
          { status: 'PENDING', timestamp: new Date().toISOString(), note: 'created' },
          { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'ok' },
        ] as any}
      />,
    );

    expect(screen.getByLabelText('order-timeline')).toBeInTheDocument();
  });

  it('empty timeline state', () => {
    render(<OrderTimeline timeline={[]} />);
    expect(screen.getByText(/No timeline yet/i)).toBeInTheDocument();
  });
});
