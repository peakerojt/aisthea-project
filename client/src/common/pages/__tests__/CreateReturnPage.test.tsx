import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateReturnPage } from '@/common/pages/CreateReturnPage';

const navigate = vi.fn();
const useParams = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => useParams(),
}));

vi.mock('@/store/pages/CreateReturnRequest', () => ({
  CreateReturnRequest: ({
    orderIdForReturn,
    onSuccess,
    onBackToOrders,
  }: {
    orderIdForReturn: number;
    onSuccess?: (returnId?: number) => void;
    onBackToOrders?: () => void;
  }) => (
    <div>
      <div>create:{orderIdForReturn}</div>
      <button onClick={() => onSuccess?.(91)}>success-with-id</button>
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
  beforeEach(() => {
    navigate.mockReset();
    useParams.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('passes the numeric order id into the create-return view', () => {
    useParams.mockReturnValue({ id: '123' });

    render(<CreateReturnPage />);

    expect(screen.getByText('create:123')).toBeInTheDocument();
  });

  it('switches to return detail after a successful create with return id', async () => {
    useParams.mockReturnValue({ id: '123' });

    render(<CreateReturnPage />);
    await userEvent.click(screen.getByRole('button', { name: 'success-with-id' }));

    expect(screen.getByText('detail:91')).toBeInTheDocument();
  });

  it('navigates back one step from the detail view', async () => {
    useParams.mockReturnValue({ id: '123' });

    render(<CreateReturnPage />);
    await userEvent.click(screen.getByRole('button', { name: 'success-with-id' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail-back' }));

    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('returns to my orders when create flow completes without a return id', async () => {
    useParams.mockReturnValue({ id: '123' });

    render(<CreateReturnPage />);
    await userEvent.click(screen.getByRole('button', { name: 'success-without-id' }));

    expect(navigate).toHaveBeenCalledWith('/my-orders');
  });

  it('redirects to my orders when the route id is invalid', () => {
    useParams.mockReturnValue({ id: 'abc' });

    render(<CreateReturnPage />);

    expect(navigate).toHaveBeenCalledWith('/my-orders', { replace: true });
    expect(screen.queryByText(/create:/)).not.toBeInTheDocument();
  });
});
