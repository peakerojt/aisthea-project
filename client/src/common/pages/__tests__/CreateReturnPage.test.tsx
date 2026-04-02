import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateReturnPage } from '@/common/pages/CreateReturnPage';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';

const navigate = vi.fn();
const useParams = vi.fn();
const getForOrder = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => useParams(),
}));

vi.mock('@/common/services/return.order-read.service', () => ({
  returnOrderReadService: {
    getForOrder: (...args: unknown[]) => getForOrder(...args),
  },
}));

vi.mock('@/store/pages/CreateReturnRequest', () => ({
  CreateReturnRequest: ({
    orderIdForReturn,
    onSuccess,
    onExistingReturn,
    onBackToOrders,
  }: {
    orderIdForReturn: number;
    onSuccess?: (returnId?: number) => void;
    onExistingReturn?: (returnId: number) => void;
    onBackToOrders?: () => void;
  }) => (
    <div>
      <div>create:{orderIdForReturn}</div>
      <button onClick={() => onSuccess?.(91)}>success-with-id</button>
      <button onClick={() => onExistingReturn?.(44)}>existing-return</button>
      <button onClick={() => onSuccess?.()}>success-without-id</button>
      <button onClick={() => onBackToOrders?.()}>back-to-orders</button>
    </div>
  ),
}));

vi.mock('@/store/pages/ReturnDetail', () => ({
  ReturnDetail: ({
    returnId,
    onBack,
  }: {
    returnId: number;
    onBack: () => void;
  }) => (
    <div>
      <div>detail:{returnId}</div>
      <button onClick={onBack}>detail-back</button>
    </div>
  ),
}));

describe('CreateReturnPage', () => {
  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <CreateReturnPage />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    navigate.mockReset();
    useParams.mockReset();
    getForOrder.mockReset();
    getForOrder.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('passes the numeric order id into the create-return view', async () => {
    useParams.mockReturnValue({ id: '123' });

    renderPage();

    expect(await screen.findByText('create:123')).toBeInTheDocument();
  });

  it('switches to return detail after a successful create with return id', async () => {
    useParams.mockReturnValue({ id: '123' });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'success-with-id' }));

    expect(screen.getByText('detail:91')).toBeInTheDocument();
  });

  it('switches to return detail when create detects an existing active return', async () => {
    useParams.mockReturnValue({ id: '123' });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'existing-return' }));

    expect(screen.getByText('detail:44')).toBeInTheDocument();
  });

  it('returns directly to my orders from the detail view', async () => {
    useParams.mockReturnValue({ id: '123' });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'success-with-id' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail-back' }));

    expect(navigate).toHaveBeenCalledWith('/my-orders');
  });

  it('returns to my orders when create flow completes without a return id', async () => {
    useParams.mockReturnValue({ id: '123' });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'success-without-id' }));

    expect(navigate).toHaveBeenCalledWith('/my-orders');
  });

  it('redirects to my orders when the route id is invalid', () => {
    useParams.mockReturnValue({ id: 'abc' });

    renderPage();

    expect(navigate).toHaveBeenCalledWith('/my-orders', { replace: true });
    expect(screen.queryByText(/create:/)).not.toBeInTheDocument();
  });

  it('opens the existing return detail when the order already has a return request', async () => {
    useParams.mockReturnValue({ id: '123' });
    getForOrder.mockResolvedValueOnce({ returnId: 55 });

    renderPage();

    expect(await screen.findByText('detail:55')).toBeInTheDocument();
    expect(getForOrder).toHaveBeenCalledWith(123);
  });

  it('refetches existing return state when a matching summary event is dispatched', async () => {
    useParams.mockReturnValue({ id: '123' });
    getForOrder
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ returnId: 77 });

    renderPage();

    expect(await screen.findByText('create:123')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(RETURN_SUMMARY_CHANGED_EVENT, {
          detail: { orderId: 123, returnRequestId: 77 },
        }),
      );
    });

    expect(await screen.findByText('detail:77')).toBeInTheDocument();
    expect(getForOrder).toHaveBeenCalledTimes(2);
  });
});
