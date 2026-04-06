import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminStatusFilterBar } from '@/admin/components/AdminUI';

describe('AdminStatusFilterBar', () => {
  const items = [
    { key: 'ALL', label: 'Tat ca', count: 8 },
    { key: 'OPEN', label: 'Dang mo', count: 3 },
  ];

  it('keeps the refresh rail mounted and only toggles its state', () => {
    const { rerender } = render(
      <AdminStatusFilterBar
        items={items}
        activeKey="ALL"
        onChange={vi.fn()}
        isRefreshing={false}
        refreshLabel="Dang cap nhat"
      />,
    );

    const rail = screen.getByTestId('admin-status-filter-bar').querySelector('[data-admin-status-refresh-rail="true"]');
    expect(rail).toBeInTheDocument();
    expect(rail).toHaveAttribute('data-refreshing', 'false');

    rerender(
      <AdminStatusFilterBar
        items={items}
        activeKey="ALL"
        onChange={vi.fn()}
        isRefreshing
        refreshLabel="Dang cap nhat"
      />,
    );

    expect(screen.getByTestId('admin-status-filter-bar').querySelector('[data-admin-status-refresh-rail="true"]')).toHaveAttribute('data-refreshing', 'true');
  });
});
