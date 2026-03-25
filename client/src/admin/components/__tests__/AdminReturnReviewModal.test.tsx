import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.service');

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      switch (key) {
        case 'modal.title':
          return 'Xem xét yêu cầu trả hàng';
        case 'modal.orderInfo':
          return `Đơn hàng #${String(options?.orderNumber ?? '')} — ${String(options?.customer ?? '')}`;
        case 'modal.customer':
          return 'Khách hàng';
        case 'modal.requestDate':
          return 'Ngày yêu cầu';
        case 'modal.orderValue':
          return 'Giá trị đơn';
        case 'modal.returnReason':
          return 'Lý do trả hàng';
        case 'modal.adminNote':
          return 'Ghi chú xử lý';
        case 'modal.proofImageAlt':
          return 'Minh chứng';
        case 'modal.proofImageAltNumber':
          return `Minh chứng ${String(options?.index ?? '')}`;
        case 'modal.proofLightboxLabel':
          return 'Xem ảnh minh chứng';
        case 'modal.closeProofLightbox':
          return 'Đóng ảnh minh chứng';
        case 'modal.rejectRequired':
          return 'Vui lòng nhập lý do từ chối.';
        case 'modal.rejectReason':
          return 'Lý do từ chối';
        case 'modal.rejectPlaceholder':
          return 'Nhập lý do từ chối yêu cầu trả hàng...';
        case 'modal.actionReject':
          return 'Từ chối yêu cầu';
        case 'modal.actionApprove':
          return 'Duyệt yêu cầu';
        case 'modal.actionRefund':
          return 'Chấp nhận & Hoàn tiền';
        case 'modal.actionConfirmReject':
          return 'Xác nhận từ chối';
        case 'modal.actionCancelReject':
          return 'Hủy';
        case 'modal.processing':
          return 'Đang xử lý...';
        case 'table.guest':
          return 'Khách vãng lai';
        case 'status.REQUESTED':
          return 'Chờ duyệt';
        case 'status.APPROVED':
          return 'Đã duyệt';
        case 'status.REJECTED':
          return 'Đã từ chối';
        case 'status.RECEIVED':
          return 'Đã nhận hàng';
        case 'status.REFUNDED':
          return 'Đã hoàn tiền';
        case 'reasons.DEFECTIVE':
          return 'Sản phẩm lỗi';
        default:
          return key;
      }
    },
  }),
}));

const detailMock = vi.hoisted(() => vi.fn());

vi.mock('@/common/services/return.service', () => ({
  adminReturnService: {
    detail: (...args: unknown[]) => detailMock(...args),
  },
}));

type AdminReturnReviewModalProps = React.ComponentProps<
  typeof import('@/admin/components/AdminReturnReviewModal').AdminReturnReviewModal
>;

let AdminReturnReviewModal: typeof import('@/admin/components/AdminReturnReviewModal').AdminReturnReviewModal;

const createReturnItem = (
  overrides: Partial<AdminReturnReviewModalProps['item']> = {},
): AdminReturnReviewModalProps['item'] => ({
  returnId: 12,
  orderId: 101,
  userId: 7,
  reason: 'DEFECTIVE',
  proofImages: [],
  status: 'REQUESTED',
  adminNote: null,
  createdAt: '2026-03-20T10:00:00.000Z',
  updatedAt: '2026-03-20T10:00:00.000Z',
  order: {
    orderNumber: 'OD-101',
    totalAmount: '125000',
    customerName: 'Nguyen Van A',
    customerPhone: '0900000000',
  },
  user: {
    userId: 7,
    fullName: 'Nguyen Van A',
    email: 'customer@example.com',
    avatarUrl: null,
  },
  ...overrides,
});

describe('AdminReturnReviewModal', () => {
  beforeAll(async () => {
    ({ AdminReturnReviewModal } = await import('@/admin/components/AdminReturnReviewModal'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('hydrates detail data and renders hydrated admin note and proof image', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        adminNote: 'Đã kiểm tra và chờ nhận hàng hoàn.',
        proofImages: ['https://cdn.example.com/proof-1.jpg'],
        user: {
          userId: 8,
          fullName: 'Hydrated User',
          email: 'hydrated@example.com',
          avatarUrl: null,
        },
      }),
    );

    render(
      <AdminReturnReviewModal
        item={createReturnItem({ user: null })}
        onClose={vi.fn()}
        onAction={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledWith(12);
    });

    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Hình ảnh minh chứng (1)')).toBeInTheDocument();
    expect(await screen.findByText('Đã kiểm tra và chờ nhận hàng hoàn.')).toBeInTheDocument();
    expect(screen.getByText('Hydrated User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minh chứng 1' })).toBeInTheDocument();
  });

  it('requires reject note and submits trimmed reject note', async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    detailMock.mockResolvedValueOnce(createReturnItem());

    render(
      <AdminReturnReviewModal
        item={createReturnItem()}
        onClose={vi.fn()}
        onAction={onAction}
      />,
    );

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledWith(12);
    });

    await userEvent.click(screen.getAllByRole('button', { name: 'Từ chối yêu cầu' })[0]);

    const confirmRejectButton = screen.getByRole('button', { name: 'Xác nhận từ chối' });
    expect(confirmRejectButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Nhập lý do từ chối yêu cầu trả hàng...'), '  Không đạt điều kiện hoàn tiền  ');
    expect(confirmRejectButton).toBeEnabled();

    await userEvent.click(confirmRejectButton);

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith(12, 'REJECT', 'Không đạt điều kiện hoàn tiền');
    });
  });

  it('opens and closes the proof image lightbox', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        proofImages: ['https://cdn.example.com/proof-2.jpg'],
      }),
    );

    render(
      <AdminReturnReviewModal
        item={createReturnItem()}
        onClose={vi.fn()}
        onAction={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const proofImageButton = await screen.findByRole('button', { name: 'Minh chứng 1' });
    await userEvent.click(proofImageButton);

    expect(await screen.findByLabelText('Xem ảnh minh chứng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đóng ảnh minh chứng' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Xem ảnh minh chứng')).not.toBeInTheDocument();
    });
  });
});
