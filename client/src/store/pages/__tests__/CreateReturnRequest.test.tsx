import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';

const createMock = vi.fn();
const getMyOrderDetailMock = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'A' } }),
}));

vi.mock('@/common/services/return.service', () => ({
  returnService: {
    create: (...args: any[]) => createMock(...args),
  },
}));

vi.mock('@/common/services/order.service', () => ({
  orderService: {
    getMyOrderDetail: (...args: any[]) => getMyOrderDetailMock(...args),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <CreateReturnRequest onSuccess={onSuccess} orderIdForReturn={100} />
    </QueryClientProvider>,
  );

  return { onSuccess };
};

describe('CreateReturnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyOrderDetailMock.mockResolvedValue({
      orderId: 100,
      orderNumber: 'OD100',
      status: 'DELIVERED',
      items: [
        {
          orderItemId: 10,
          productName: 'Shirt',
          variantName: 'M',
          quantity: 2,
          unitPrice: 150000,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows validation when no item selected', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Đổi ý / Không còn nhu cầu' })).toBeInTheDocument();
    expect(screen.getByText('Đơn #OD100 · DELIVERED')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText('Chọn ít nhất 1 sản phẩm để trả')).toBeInTheDocument();
  });

  it('submits selected item', async () => {
    const { onSuccess } = renderPage();
    createMock.mockResolvedValue({ returnRequestId: 501 });

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    const checkbox = screen.getAllByRole('checkbox')[0];
    await userEvent.click(checkbox);
    await userEvent.type(screen.getByPlaceholderText('Mô tả vấn đề chi tiết...'), 'Ao bi loi duong may');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        orderId: 100,
        reason: 'CHANGED_MIND',
        note: 'Ao bi loi duong may',
        items: [
          {
            orderItemId: 10,
            quantity: 1,
          },
        ],
        attachments: undefined,
      });
      expect(onSuccess).toHaveBeenCalledWith(501);
    });
  });

  it('shows attachment validation for invalid url', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('https://...'), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: '+ Thêm' }));

    expect(await screen.findByText('URL ảnh không hợp lệ')).toBeInTheDocument();
  });

  it('shows translated quantity validation from the schema', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);

    const quantityInput = screen.getByRole('spinbutton');
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText('Số lượng tối thiểu là 1')).toBeInTheDocument();
  });

  it('falls back to readable item and attachment labels when translations are unavailable', async () => {
    getMyOrderDetailMock.mockResolvedValueOnce({
      orderId: 100,
      orderNumber: 'OD100',
      status: 'DELIVERED',
      items: [
        {
          orderItemId: 10,
          productName: null,
          variantName: null,
          quantity: 2,
          unitPrice: 150000,
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm #10')).toBeInTheDocument();
    expect(screen.getByText('Đã mua: 2')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://cdn.example.com/proof-1.jpg');
    await userEvent.click(screen.getByRole('button', { name: '+ Thêm' }));

    expect(await screen.findByAltText('Ảnh minh chứng 1')).toBeInTheDocument();
  });
});
