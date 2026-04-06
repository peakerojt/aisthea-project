import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminRefreshState } from '@/admin/components/AdminUI';

describe('AdminRefreshState', () => {
  it('keeps the refresh rail mounted and only toggles its state', () => {
    const { rerender } = render(<AdminRefreshState isRefreshing={false} label="Dang tai lai" />);

    const rail = screen.getByTestId('admin-refresh-state').querySelector('[data-admin-refresh-rail="true"]');
    expect(rail).toBeInTheDocument();
    expect(rail).toHaveAttribute('data-refreshing', 'false');

    rerender(<AdminRefreshState isRefreshing label="Dang tai lai" />);

    expect(screen.getByTestId('admin-refresh-state').querySelector('[data-admin-refresh-rail="true"]')).toHaveAttribute('data-refreshing', 'true');
  });
});
