import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';

const createMock = vi.fn();
const getMyOrderDetailMock = vi.fn();
const getForOrderMock = vi.fn();
const uploadReturnProofImagesMock = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'A' } }),
}));

vi.mock('@/common/services/return.customer-write.service', () => ({
  returnCustomerWriteService: {
    create: (...args: any[]) => createMock(...args),
  },
}));

vi.mock('@/common/services/return.order-read.service', () => ({
  returnOrderReadService: {
    getForOrder: (...args: any[]) => getForOrderMock(...args),
  },
}));

vi.mock('@/common/services/order.service', () => ({
  orderService: {
    getMyOrderDetail: (...args: any[]) => getMyOrderDetailMock(...args),
    uploadReturnProofImages: (...args: any[]) => uploadReturnProofImagesMock(...args),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/common/utils/imageCompression', () => ({
  compressImage: async (file: File) => ({
    file,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 1,
  }),
  isValidImageType: (file: File) =>
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();
  const onExistingReturn = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <CreateReturnRequest
        onSuccess={onSuccess}
        onExistingReturn={onExistingReturn}
        orderIdForReturn={100}
      />
    </QueryClientProvider>,
  );

  return { onSuccess, onExistingReturn };
};

describe('CreateReturnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getForOrderMock.mockResolvedValue(null);
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
          thumbnailUrl: 'https://cdn.example.com/shirt.jpg',
        },
      ],
    });
    uploadReturnProofImagesMock.mockResolvedValue([]);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders upload dropzone and keeps item-selection validation', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();
    expect(screen.getByText('Chính sách trả hàng')).toBeInTheDocument();
    expect(screen.getByText('Thời gian xử lý dự kiến')).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Bạn có thể thêm chi tiết riêng cho từng sản phẩm ở bên dưới.')).toBeInTheDocument();
    expect(screen.getByAltText('Shirt')).toBeInTheDocument();
    expect(screen.getByText('Thời gian xử lý dự kiến').closest('div')?.parentElement).toHaveClass('border-sky-400/20');
    expect(screen.getAllByText('Kéo thả ảnh vào đây hoặc chọn từ thiết bị').length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText('https://...')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chọn ảnh cho sản phẩm #10')).not.toBeInTheDocument();
    expect(screen.getByText('0 sản phẩm được chọn')).toBeInTheDocument();
    expect(screen.queryByText('Đã chọn')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText('Chọn ít nhất 1 sản phẩm để trả')).toBeInTheDocument();
  });

  it('submits selected item without attachments', async () => {
    const { onSuccess } = renderPage();
    createMock.mockResolvedValue({ returnRequestId: 501 });
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.type(screen.getByPlaceholderText('Mô tả vấn đề chi tiết...'), 'Ao bi loi duong may');

    expect(screen.getByText('1 sản phẩm được chọn')).toBeInTheDocument();
    expect(screen.getByText('Ao bi loi duong may')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm đã chọn')).toBeInTheDocument();
    expect(screen.getAllByText('Shirt').length).toBeGreaterThan(1);
    expect(screen.getByText('Tổng số lượng trả')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

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
            reasonCode: 'CHANGED_MIND',
            attachments: undefined,
          },
        ],
        attachments: undefined,
      });
      expect(onSuccess).toHaveBeenCalledWith(501);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RETURN_SUMMARY_CHANGED_EVENT,
          detail: {
            orderId: 100,
            returnRequestId: 501,
          },
        }),
      );
    });

    dispatchEventSpy.mockRestore();
  });

  it('uploads request-level proof images and submits their returned URLs', async () => {
    renderPage();
    createMock.mockResolvedValue({ returnRequestId: 502 });
    uploadReturnProofImagesMock.mockResolvedValue([
      { url: 'https://cdn.example.com/proof-1.jpg', width: 1200, height: 900 },
    ]);

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Chọn ảnh minh chứng') as HTMLInputElement;
    const file = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadReturnProofImagesMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByAltText('Ảnh minh chứng 1')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        orderId: 100,
        reason: 'CHANGED_MIND',
        note: undefined,
        items: [
          {
            orderItemId: 10,
            quantity: 1,
            reasonCode: 'CHANGED_MIND',
            attachments: undefined,
          },
        ],
        attachments: ['https://cdn.example.com/proof-1.jpg'],
      });
    });
  });

  it('removes uploaded request-level proof images when delete is clicked', async () => {
    renderPage();
    uploadReturnProofImagesMock.mockResolvedValue([
      { url: 'https://cdn.example.com/proof-1.jpg', width: 1200, height: 900 },
    ]);

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Chọn ảnh minh chứng') as HTMLInputElement;
    const file = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    expect(await screen.findByAltText('Ảnh minh chứng 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }));

    await waitFor(() => {
      expect(screen.queryByAltText('Ảnh minh chứng 1')).not.toBeInTheDocument();
      expect(screen.getByText('0/5 ảnh')).toBeInTheDocument();
    });
  });

  it('uploads item-level proof images for selected items', async () => {
    renderPage();
    createMock.mockResolvedValue({ returnRequestId: 503 });
    uploadReturnProofImagesMock.mockResolvedValue([
      { url: 'https://cdn.example.com/item-proof-1.jpg', width: 1200, height: 900 },
    ]);

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Thêm chi tiết cho sản phẩm này' }));

    const fileInput = screen.getByLabelText('Chọn ảnh cho sản phẩm #10') as HTMLInputElement;
    const file = new File(['proof'], 'item-proof.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadReturnProofImagesMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByAltText('Ảnh minh chứng sản phẩm #10 - 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        orderId: 100,
        reason: 'CHANGED_MIND',
        note: undefined,
        items: [
          {
            orderItemId: 10,
            quantity: 1,
            reasonCode: 'CHANGED_MIND',
            attachments: ['https://cdn.example.com/item-proof-1.jpg'],
          },
        ],
        attachments: undefined,
      });
    });
  });

  it('keeps item details collapsed until the accordion is opened', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(screen.queryByText('Lý do riêng')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chọn ảnh cho sản phẩm #10')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thêm chi tiết cho sản phẩm này' }));

    expect(screen.getByText('Lý do riêng')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết thêm')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn ảnh cho sản phẩm #10')).toBeInTheDocument();
  });

  it('disables quantity stepper controls at min and max values and updates summary quantity', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);

    const decreaseButton = screen.getByRole('button', { name: 'Giảm số lượng sản phẩm #10' });
    const increaseButton = screen.getByRole('button', { name: 'Tăng số lượng sản phẩm #10' });

    expect(decreaseButton).toBeDisabled();
    expect(increaseButton).not.toBeDisabled();

    await userEvent.click(increaseButton);

    expect(increaseButton).toBeDisabled();
    expect(screen.getByText('Tổng số lượng trả')).toBeInTheDocument();
    expect(screen.getByText('1 sản phẩm • 2 món')).toBeInTheDocument();
  });

  it('disables submit while proof images are still uploading', async () => {
    renderPage();
    uploadReturnProofImagesMock.mockImplementation(
      () => new Promise(() => undefined),
    );

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Chọn ảnh minh chứng') as HTMLInputElement;
    const file = new File(['proof'], 'slow-proof.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    expect(screen.getAllByText('Đang tải ảnh minh chứng...').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu' })).toBeDisabled();
  });

  it('redirects to the existing return detail when create hits RETURN_ALREADY_EXISTS', async () => {
    const { onSuccess, onExistingReturn } = renderPage();
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    createMock.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'RETURN_ALREADY_EXISTS',
            details: {
              returnRequestId: 777,
            },
          },
        },
      },
    });

    expect(await screen.findByRole('heading', { name: 'Yêu cầu trả hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(getForOrderMock).not.toHaveBeenCalled();
      expect(onExistingReturn).toHaveBeenCalledWith(777);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RETURN_SUMMARY_CHANGED_EVENT,
          detail: {
            orderId: 100,
            returnRequestId: 777,
          },
        }),
      );
    });

    dispatchEventSpy.mockRestore();
  });
});
