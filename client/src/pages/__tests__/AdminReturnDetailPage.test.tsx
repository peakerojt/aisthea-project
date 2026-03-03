import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AdminReturnDetailPage } from '../AdminReturnDetailPage';

const detailMock = vi.fn();
const approveMock = vi.fn();
const rejectMock = vi.fn();
const markReceivedMock = vi.fn();
const refundMock = vi.fn();

vi.mock('../../services/return.service', () => ({
  returnService: {
    detail: (...args: any[]) => detailMock(...args),
    adminApprove: (...args: any[]) => approveMock(...args),
    adminReject: (...args: any[]) => rejectMock(...args),
    adminMarkReceived: (...args: any[]) => markReceivedMock(...args),
    adminRefund: (...args: any[]) => refundMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={qc}>
      <AdminReturnDetailPage returnId={1} setView={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe('AdminReturnDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detailMock.mockResolvedValue({
      data: {
        data: {
          returnRequestId: 1,
          orderId: 100,
          status: 'REQUESTED',
          reason: 'DEFECTIVE',
          totalRefundAmount: 150000,
          items: [],
          statusLogs: [],
        },
      },
    });
  });

  it('can approve', async () => {
    renderPage();
    approveMock.mockResolvedValue({ data: { success: true } });

    expect(await screen.findByText('Return #1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(approveMock).toHaveBeenCalledTimes(1));
  });

  it('requires reject reason and then reject', async () => {
    renderPage();
    rejectMock.mockResolvedValue({ data: { success: true } });

    expect(await screen.findByText('Return #1')).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    expect(rejectBtn).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Reason for reject'), 'Invalid evidence');
    await userEvent.click(rejectBtn);

    await waitFor(() => expect(rejectMock).toHaveBeenCalledTimes(1));
  });

  it('refund action calls API', async () => {
    renderPage();
    refundMock.mockResolvedValue({ data: { success: true } });

    expect(await screen.findByText('Return #1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));

    await waitFor(() => expect(refundMock).toHaveBeenCalledTimes(1));
  });
});
