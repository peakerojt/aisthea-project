import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminRefreshState } from '@/admin/components/AdminUI';

describe('AdminRefreshState', () => {
  it('keeps the refresh badge mounted and only toggles its state', () => {
    const { rerender } = render(<AdminRefreshState isRefreshing={false} label="Dang tai lai" />);

    const badge = screen.getByTestId('admin-refresh-state').querySelector('[data-admin-refresh-badge="true"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-refreshing', 'false');
    expect(screen.getByTestId('admin-refresh-state').querySelector('[data-admin-refresh-rail="true"]')).not.toBeInTheDocument();

    rerender(<AdminRefreshState isRefreshing label="Dang tai lai" />);

    expect(screen.getByTestId('admin-refresh-state').querySelector('[data-admin-refresh-badge="true"]')).toHaveAttribute('data-refreshing', 'true');
  });
});
