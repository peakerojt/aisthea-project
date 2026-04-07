import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailQueue } from '@/admin/pages/EmailQueue';

const searchParamsState = vi.hoisted(() => ({ value: '' }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
const retryMock = vi.hoisted(() => vi.fn());
const cleanupMock = vi.hoisted(() => vi.fn());

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(searchParamsState.value), setSearchParamsMock],
}));

vi.mock('@/admin/services/notifications.service', () => ({
  notificationQueueService: {
    list: (...args: unknown[]) => listMock(...args),
    retry: (...args: unknown[]) => retryMock(...args),
    cleanup: (...args: unknown[]) => cleanupMock(...args),
  },
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminActionButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AdminEmptyState: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  AdminPageHeader: ({
    title,
    subtitle,
    meta,
    actions,
  }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <span>{meta}</span>
      {actions}
    </div>
  ),
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminStatCards: ({ items }: { items: Array<{ label: React.ReactNode; value: React.ReactNode }> }) => (
    <div>
      {items.map((item) => (
        <div key={String(item.label)}>
          <span>{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  ),
  AdminStatusFilterBar: ({
    items,
    activeKey,
    onChange,
  }: {
    items: Array<{ key: string; label: React.ReactNode; count?: number | React.ReactNode }>;
    activeKey: string;
    onChange: (key: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          data-active={item.key === activeKey ? 'true' : 'false'}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.count}
        </button>
      ))}
    </div>
  ),
  AdminToolbar: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      <div>{children}</div>
      <div>{actions}</div>
    </div>
  ),
  adminUiTokens: {
    fieldLabel: 'field-label',
    searchFieldControl: 'search-field',
    fieldControl: 'field-control',
  },
}));

const buildListPayload = () => ({
  items: [
    {
      emailJobId: 42,
      eventKey: 'order-placed:42',
      eventType: 'ORDER_PLACED',
      recipient: 'customer@example.com',
      status: 'FAILED',
      attempts: 2,
      lastError: 'SMTP timeout',
      provider: 'smtp',
      providerMessageId: null,
      scheduledAt: '2026-04-07T10:00:00.000Z',
      sentAt: null,
      createdAt: '2026-04-07T09:58:00.000Z',
      updatedAt: '2026-04-07T10:01:00.000Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  summary: {
    total: 1,
    byStatus: {
      FAILED: 1,
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
    },
    byEventType: {
      ORDER_PLACED: 1,
    },
  },
});

describe('EmailQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = '';
    setSearchParamsMock.mockReset();
    useAuthMock.mockReturnValue({
      user: {
        roles: ['Support'],
        permissions: ['VIEW_ORDER', 'EDIT_ORDER'],
      },
    });
    listMock.mockResolvedValue(buildListPayload());
    retryMock.mockResolvedValue({ emailJobId: 42, status: 'PENDING' });
    cleanupMock.mockResolvedValue({
      deletedCount: 3,
      olderThanDays: 30,
      statuses: ['FAILED', 'SENT'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders queue rows and allows retry plus cleanup for write-capable staff', async () => {
    render(<EmailQueue />);

    expect(await screen.findByText('Email Queue')).toBeInTheDocument();
    expect((await screen.findAllByText('Đơn hàng mới')).length).toBeGreaterThan(0);
    expect(screen.getByText('customer@example.com')).toBeInTheDocument();
    expect(screen.getByText('SMTP timeout')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(retryMock).toHaveBeenCalledWith(42);
    });

    expect(await screen.findByText('Đã đưa email job #42 về hàng chờ.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /dọn job cũ/i }));

    await waitFor(() => {
      expect(cleanupMock).toHaveBeenCalledWith({
        olderThanDays: 30,
        statuses: ['FAILED', 'SENT'],
      });
    });

    expect(await screen.findByText('Đã dọn 3 email job cũ hơn 30 ngày.')).toBeInTheDocument();
  });

  it('disables retry and hides cleanup for read-only staff', async () => {
    useAuthMock.mockReturnValue({
      user: {
        roles: ['Support'],
        permissions: ['VIEW_ORDER'],
      },
    });

    render(<EmailQueue />);

    expect(await screen.findByText('Email Queue')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dọn job cũ/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();
  });
});
