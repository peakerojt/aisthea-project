import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderActionPanel } from '@/admin/components/OrderActionPanel';

const updateStatus = vi.fn();
const uploadDeliveryProofImages = vi.fn();

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    adminOrderService: {
      ...actual.adminOrderService,
      updateStatus: (...args: any[]) => updateStatus(...args),
      uploadDeliveryProofImages: (...args: any[]) => uploadDeliveryProofImages(...args),
    },
  };
});

describe('OrderActionPanel shipping action', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms shipping without requesting carrier or tracking number', async () => {
    updateStatus.mockResolvedValueOnce({ success: true, stockRestored: false, messageKey: 'ORDER_STATUS_UPDATED' });

    const user = userEvent.setup();
    render(
      <OrderActionPanel
        orderId={101}
        currentStatus="Processing"
        onStatusUpdated={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Bắt đầu giao hàng' }));

    expect(screen.queryByPlaceholderText('Ví dụ: Giao Hàng Tiết Kiệm')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ví dụ: GHTK-123456789')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith(101, { status: 'Shipping', note: undefined });
    });
  });

  it('requires delivery proof images and review confirmation before marking delivered', async () => {
    uploadDeliveryProofImages.mockResolvedValueOnce([
      { url: 'https://example.com/proof-1.jpg', width: 1200, height: 900 },
    ]);
    updateStatus.mockResolvedValueOnce({ success: true, stockRestored: false, messageKey: 'ORDER_STATUS_UPDATED' });

    const onError = vi.fn();
    const user = userEvent.setup();
    render(
      <OrderActionPanel
        orderId={202}
        currentStatus="Shipping"
        onStatusUpdated={vi.fn()}
        onError={onError}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Xác nhận giao hàng' }));

    expect(screen.getByText('Tải lên ảnh xác nhận giao hàng và đánh dấu đã xem lại hình ảnh trước khi chuyển đơn sang trạng thái đã giao hàng.')).toBeInTheDocument();
    expect(screen.getByText('Ảnh xác nhận giao hàng')).toBeInTheDocument();
    expect(screen.getByText('Chọn tối đa 5 ảnh giao hàng')).toBeInTheDocument();
    expect(screen.getByText('Mình xác nhận ảnh tải lên là đúng đơn hàng và đủ để chứng minh đã giao.')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận đã giao' });
    expect(confirmButton).toBeDisabled();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    expect(await screen.findByText('proof.jpg')).toBeInTheDocument();
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(screen.getByText('Vui lòng xác nhận đã xem lại hình ảnh giao hàng trước khi tiếp tục.')).toBeInTheDocument();
    expect(uploadDeliveryProofImages).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Đã xem lại hình ảnh giao hàng/i }));
    expect(screen.getByRole('button', { name: 'Xác nhận đã giao' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Xác nhận đã giao' }));

    await waitFor(() => {
      expect(uploadDeliveryProofImages).toHaveBeenCalledTimes(1);
    });
    expect(uploadDeliveryProofImages.mock.calls[0]?.[0]).toBe(202);
    expect(uploadDeliveryProofImages.mock.calls[0]?.[1]).toEqual([expect.any(File)]);
    expect(uploadDeliveryProofImages.mock.calls[0]?.[2]).toEqual(expect.any(Function));
    expect(updateStatus).toHaveBeenCalledWith(202, {
      status: 'Delivered',
      note: undefined,
      deliveryProofImages: ['https://example.com/proof-1.jpg'],
      deliveryProofReviewed: true,
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('removes the legacy returned action from shipping and return-requested orders', () => {
    const { rerender } = render(
      <OrderActionPanel
        orderId={303}
        currentStatus="Shipping"
        onStatusUpdated={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Xác nhận trả hàng' })).not.toBeInTheDocument();

    rerender(
      <OrderActionPanel
        orderId={303}
        currentStatus="RETURN_REQUESTED"
        onStatusUpdated={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Xác nhận trả hàng' })).not.toBeInTheDocument();
  });
});
