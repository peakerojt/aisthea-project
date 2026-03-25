import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderStatusBadge, getStatusTone, translateOrderStatus } from '@/admin/components/OrderStatusBadge';

describe('OrderStatusBadge', () => {
  it('renders return requested with the translated label', () => {
    render(<OrderStatusBadge status="RETURN_REQUESTED" />);

    expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
  });

  it('keeps return requested tone out of pending fallback', () => {
    expect(getStatusTone('RETURN_REQUESTED')).toContain('orange-500');
  });

  it('translates return requested outside the component helper', () => {
    expect(translateOrderStatus('RETURN_REQUESTED')).toBe('Yêu cầu trả hàng');
  });
});
