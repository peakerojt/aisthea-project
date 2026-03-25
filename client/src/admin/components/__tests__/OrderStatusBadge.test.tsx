import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OrderStatusBadge, getStatusTone, translateOrderStatus } from '@/admin/components/OrderStatusBadge';

describe('OrderStatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('normalizes hyphenated return requested statuses', () => {
    render(<OrderStatusBadge status="return-requested" />);

    expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
  });

  it('normalizes spaced return requested statuses for helper lookups', () => {
    expect(getStatusTone('return requested')).toContain('orange-500');
    expect(translateOrderStatus('return requested')).toBe('Yêu cầu trả hàng');
  });

  it('normalizes canceled aliases to the cancelled label and tone', () => {
    render(<OrderStatusBadge status=" canceled " />);

    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    expect(getStatusTone('canceled')).toContain('red-500');
    expect(translateOrderStatus('canceled')).toBe('Đã hủy');
  });

  it('normalizes completed aliases to the delivered label and tone', () => {
    render(<OrderStatusBadge status=" completed " />);

    expect(screen.getByText('Đã giao hàng')).toBeInTheDocument();
    expect(getStatusTone('completed')).toContain('emerald-500');
    expect(translateOrderStatus('completed')).toBe('Đã giao hàng');
  });
});
