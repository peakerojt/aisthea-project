import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrackingTimeline } from '../OrderTimeline';

describe('TrackingTimeline', () => {
  it('render timeline', () => {
    render(
      <TrackingTimeline
        timeline={[
          { status: 'PENDING', timestamp: new Date().toISOString(), note: 'created' },
          { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'ok' },
        ]}
      />,
    );

    expect(screen.getByLabelText('order-timeline')).toBeInTheDocument();
  });

  it('empty timeline state', () => {
    render(<TrackingTimeline timeline={[]} />);
    expect(screen.getByText(/No timeline yet/i)).toBeInTheDocument();
  });
});
