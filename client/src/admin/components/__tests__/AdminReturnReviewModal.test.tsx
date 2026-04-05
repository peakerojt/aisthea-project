import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReviewActions } from '@/admin/test-utils/createMockReviewActions';

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
        case 'detail.infoExpectedRefund':
          return 'Hoàn tiền dự kiến';
        case 'detail.infoExpectedRefundHint':
          return 'Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.';
        case 'modal.refundStatus':
          return 'Trạng thái hoàn tiền';
        case 'modal.financeNote':
          return 'Ghi chú tài chính';
        case 'modal.financeNoteMeta':
          return `Cập nhật ${String(options?.date ?? '')} · ${String(options?.actor ?? '')}`;
        case 'modal.returnReason':
          return 'Lý do trả hàng';
        case 'detail.itemsTitle':
          return 'Sản phẩm trả';
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
        case 'modal.financeNoteRequired':
          return 'Vui lòng nhập ghi chú xử lý hoàn tiền.';
        case 'modal.refundFailedReason':
          return 'Lý do hoàn tiền lỗi';
        case 'modal.refundManualReviewReason':
          return 'Lý do kiểm tra thủ công';
        case 'modal.refundFailedPlaceholder':
          return 'Nhập lý do hoàn tiền lỗi...';
        case 'modal.refundManualReviewPlaceholder':
          return 'Nhập lý do cần kiểm tra thủ công...';
        case 'modal.actionReject':
          return 'Từ chối yêu cầu';
        case 'modal.actionApprove':
          return 'Duyệt yêu cầu';
        case 'modal.actionMarkInTransit':
          return 'Đánh dấu đang hoàn về kho';
        case 'modal.actionMarkReceived':
          return 'Xác nhận đã nhận hàng hoàn';
        case 'modal.actionAcceptForRefund':
          return 'Chấp nhận hoàn tiền';
        case 'modal.actionRefundPending':
          return 'Đặt lại chờ hoàn tiền';
        case 'modal.actionRefundProcessing':
          return 'Đánh dấu đang hoàn tiền';
        case 'modal.actionRefundFailed':
          return 'Đánh dấu hoàn tiền lỗi';
        case 'modal.actionRefundManualReview':
          return 'Chuyển kiểm tra thủ công';
        case 'modal.actionContinueRefund':
          return 'Tiếp tục tới hoàn tiền';
        case 'modal.actionConfirmCompleteRefund':
          return 'Xác nhận chuyển khoản hoàn tiền';
        case 'modal.actionConfirmReject':
          return 'Xác nhận từ chối';
        case 'modal.actionConfirmRefundNote':
          return 'Xác nhận cập nhật';
        case 'modal.actionCancelReject':
          return 'Hủy';
        case 'modal.processing':
          return 'Đang xử lý...';
        case 'modal.refundLocked':
          return 'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.';
        case 'modal.refundLockedHint':
          return 'Đang chờ khách xác nhận đã nhận hàng để hệ thống mở khóa bước hoàn tiền.';
        case 'modal.financeActionRestricted':
          return 'Bước hoàn tiền đang chờ bộ phận tài chính xử lý.';
        case 'table.guest':
          return 'Khách vãng lai';
        case 'status.REQUESTED':
          return 'Chờ duyệt';
        case 'status.PENDING_PAYMENT_CONFIRMATION':
          return 'Chờ xác nhận thanh toán';
        case 'status.PENDING_ADMIN_REVIEW':
          return 'Chờ duyệt';
        case 'status.APPROVED':
          return 'Đã duyệt';
        case 'status.IN_RETURN_TRANSIT':
          return 'Đang hoàn về kho';
        case 'status.REJECTED':
          return 'Đã từ chối';
        case 'status.RECEIVED':
          return 'Đã nhận hàng';
        case 'status.RECEIVED_AND_INSPECTING':
          return 'Đã nhận và đang kiểm tra';
        case 'status.ACCEPTED_FOR_REFUND':
          return 'Đã chấp nhận hoàn tiền';
        case 'status.CLOSED':
          return 'Đã đóng';
        case 'status.REFUNDED':
          return 'Đã hoàn tiền';
        case 'refundStatus.NOT_APPLICABLE':
          return 'Chưa mở hoàn tiền';
        case 'refundStatus.LOCKED_UNTIL_PAYMENT_CONFIRMED':
          return 'Khóa tới khi xác nhận thanh toán';
        case 'refundStatus.PENDING':
          return 'Chờ hoàn tiền';
        case 'refundStatus.PROCESSING':
          return 'Đang hoàn tiền';
        case 'refundStatus.FAILED':
          return 'Hoàn tiền thất bại';
        case 'refundStatus.MANUAL_REVIEW':
          return 'Cần kiểm tra thủ công';
        case 'refundStatus.REFUNDED':
          return 'Đã hoàn tiền';
        case 'reasons.DEFECTIVE':
          return 'Sản phẩm lỗi';
        case 'itemsTable.grossLabel':
          return 'Gốc';
        case 'itemsTable.discountLabel':
          return 'Giảm giá';
        case 'itemsTable.netPaidLabel':
          return 'Thực trả';
        case 'itemsTable.requestedRefundLabel':
          return 'Hoàn yêu cầu';
        case 'itemsTable.columns.product':
          return 'Sản phẩm';
        case 'itemsTable.columns.quantity':
          return 'SL trả';
        case 'itemsTable.columns.unitPrice':
          return 'Đơn giá';
        case 'itemsTable.columns.subtotal':
          return 'Thành tiền';
        case 'itemsTable.columns.reason':
          return 'Lý do';
        case 'itemsTable.totalLabel':
          return 'Tổng hoàn dự kiến:';
        case 'itemsTable.grossTotalLabel':
          return 'Tổng giá gốc';
        case 'itemsTable.discountTotalLabel':
          return 'Tổng giảm giá phân bổ';
        case 'itemsTable.netPaidTotalLabel':
          return 'Tổng thực trả';
        case 'modal.economicsBreakdown':
          return 'Tóm tắt hoàn tiền';
        case 'modal.proofImages':
          return `Ảnh minh chứng (${String(options?.count ?? '')})`;
        case 'itemsTable.itemFallback':
          return `Sản phẩm #${String(options?.id ?? '')}`;
        case 'itemsTable.rowFallbackMetaLabel':
          return `Dòng sản phẩm #${String(options?.id ?? '')}`;
        case 'itemsTable.empty':
          return 'Không có sản phẩm.';
        case 'itemsTable.reasonNoteLabel':
          return 'Ghi chú';
        case 'itemsTable.attachmentsLabel':
          return 'Ảnh đính kèm';
        case 'itemsTable.productImageAlt':
          return `Ảnh sản phẩm ${String(options?.name ?? '')}`;
        case 'itemsTable.openImagePreviewForItem':
          return `Xem ảnh sản phẩm ${String(options?.name ?? '')}`;
        case 'itemsTable.imagePreviewTitle':
          return 'Xem ảnh sản phẩm';
        case 'itemsTable.closeImagePreview':
          return 'Đóng xem ảnh sản phẩm';
        default:
          return key;
      }
    },
  }),
}));

const detailMock = vi.hoisted(() => vi.fn());

vi.mock('@/admin/services', () => ({
  adminReturnReviewService: {
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
        totalRefundAmount: '100000',
        adminNote: 'Đã kiểm tra và chờ nhận hàng hoàn.',
        financeNote: 'Cần đối soát lại giao dịch hoàn tiền.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: {
          userId: 44,
          fullName: 'Finance Ops',
        },
        refundableCapAmount: '80000',
        items: [
          {
            orderItemId: 1,
            quantity: 1,
            unitPrice: 80000,
            requestedRefundAmount: 80000,
            orderItemGrossAmount: 100000,
            orderItemAllocatedDiscountAmount: 20000,
            orderItemNetPaidAmount: 80000,
            reason: 'DEFECTIVE',
          },
        ],
        refundTransactions: [
          {
            transactionId: 77,
            amount: 50000,
            method: 'BANK_TRANSFER',
            status: 'PROCESSING',
            transactionRef: 'RF-500',
          },
        ],
        refundPayoutProofs: [
          {
            refundPayoutProofId: 901,
            refundTransactionId: 77,
            fileUrl: 'https://cdn.example.com/refund-proof-1.jpg',
            fileName: 'refund-proof-1.jpg',
            createdAt: '2026-03-26T11:30:00.000Z',
          },
        ],
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
        actions={createMockReviewActions()}
        item={createReturnItem({ user: null })}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledWith(12);
    });

    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Ảnh minh chứng (1)')).toBeInTheDocument();
    expect(await screen.findByText('Đã kiểm tra và chờ nhận hàng hoàn.')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú tài chính')).toBeInTheDocument();
    expect(screen.getByText('Cần đối soát lại giao dịch hoàn tiền.')).toBeInTheDocument();
    expect(screen.getByText(/Cập nhật .*Finance Ops/)).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(screen.getAllByText('80.000đ')).not.toHaveLength(0);
    expect(screen.queryByText('Tóm tắt hoàn tiền')).not.toBeInTheDocument();
    expect(screen.getByText('Theo tổng cũ: 100.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm trả')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm #1')).toBeInTheDocument();
    expect(screen.getByText('Dòng sản phẩm #1')).toBeInTheDocument();
    expect(screen.getByText(/Gốc/)).toBeInTheDocument();
    expect(screen.getByText(/Giảm giá/)).toBeInTheDocument();
    expect(screen.getByText(/Thực trả/)).toBeInTheDocument();
    expect(screen.getByText('Giao dịch hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('50.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Chuyển khoản ngân hàng')).toBeInTheDocument();
    expect(screen.getByText('Đang hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('RF-500')).toBeInTheDocument();
    expect(screen.getByText('Chứng từ hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('refund-proof-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('Hydrated User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minh chứng 1' })).toBeInTheDocument();
  });

  it('falls back to totalRefundAmount when refundableCapAmount is unavailable', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        totalRefundAmount: '50000',
        refundableCapAmount: null,
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem({ totalRefundAmount: '50000', refundableCapAmount: null })}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledWith(12);
    });

    expect(screen.getByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(screen.getAllByText('50.000 ₫')).not.toHaveLength(0);
    expect(screen.queryByText(/Theo tổng cũ:/)).not.toBeInTheDocument();
  });

  it('requires reject note and submits trimmed reject note', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(createReturnItem());

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem()}
        onClose={vi.fn()}
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
      expect(actions.reject).toHaveBeenCalledWith(12, 'Không đạt điều kiện hoàn tiền');
    });
  });

  it('treats legacy pending approval status as requested for admin actions', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({ status: 'PENDING_APPROVAL' as any, workflowStatus: 'PENDING_APPROVAL' }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem({ status: 'PENDING_APPROVAL' as any, workflowStatus: 'PENDING_APPROVAL' })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Từ chối yêu cầu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt yêu cầu' })).toBeInTheDocument();
  });

  it('shows the next logistics step when the return has been approved', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({ status: 'APPROVED', workflowStatus: 'APPROVED' }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem({ status: 'APPROVED', workflowStatus: 'APPROVED' })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Đánh dấu đang hoàn về kho' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt yêu cầu' })).not.toBeInTheDocument();
  });

  it('shows mark received when the return is already in transit', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({ status: 'APPROVED', workflowStatus: 'IN_RETURN_TRANSIT' }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({ status: 'APPROVED', workflowStatus: 'IN_RETURN_TRANSIT' })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận đã nhận hàng hoàn' }));

    await waitFor(() => {
      expect(actions.markReceived).toHaveBeenCalledWith(12);
    });
  });

  it('shows accept-for-refund after warehouse inspection', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({ status: 'RECEIVED', workflowStatus: 'RECEIVED_AND_INSPECTING' }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({ status: 'RECEIVED', workflowStatus: 'RECEIVED_AND_INSPECTING' })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận hoàn tiền' }));

    await waitFor(() => {
      expect(actions.acceptForRefund).toHaveBeenCalledWith(12);
    });
  });

  it('shows finance refund actions after refund is accepted', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING' as any,
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Đặt lại chờ hoàn tiền' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đánh dấu đang hoàn tiền' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đánh dấu hoàn tiền lỗi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuyển kiểm tra thủ công' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục tới hoàn tiền' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu đang hoàn tiền' }));

    await waitFor(() => {
      expect(actions.setRefundProcessing).toHaveBeenCalledWith(12);
    });
  });

  it('opens a dedicated complete-refund sub-modal before submitting the bank refund', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING' as any,
        refundableCapAmount: '80000',
        bankInfo: {
          available: true,
          bankAccountId: 55,
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '123456789',
          accountHolder: 'Nguyen Van A',
          accountNumberMasked: '****6789',
          source: 'PROFILE',
          updatedAt: '2026-03-28T10:00:00.000Z',
          qrImageUrl: null,
        },
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Tiếp tục tới hoàn tiền' }));

    expect(await screen.findByRole('button', { name: 'Xác nhận chuyển khoản hoàn tiền' })).toBeInTheDocument();
    expect(screen.getAllByText('Vietcombank').length).toBeGreaterThan(0);
    expect(screen.getAllByText('123456789').length).toBeGreaterThan(0);

    await userEvent.clear(screen.getByLabelText('Số tiền hoàn'));
    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '78000');
    await userEvent.type(screen.getByLabelText('Mã giao dịch'), 'VCB-001');
    await userEvent.type(screen.getByLabelText('Ghi chú tài chính'), 'Da chuyen khoan');

    expect(screen.getByRole('button', { name: 'Xác nhận chuyển khoản hoàn tiền' })).toBeDisabled();
    expect(actions.refund).not.toHaveBeenCalled();
  });

  it('blocks continue refund when bank info is missing and offers a reminder action', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING' as any,
        bankInfo: {
          available: false,
          bankAccountId: null,
          bankName: null,
          bankCode: null,
          accountNumber: null,
          accountHolder: null,
          accountNumberMasked: null,
          source: null,
          updatedAt: null,
          qrImageUrl: null,
        },
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Khách hàng chưa cung cấp thông tin ngân hàng để hoàn tiền.')).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: 'Tiếp tục tới hoàn tiền' });
    expect(continueButton).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi nhắc bổ sung ngân hàng' }));

    await waitFor(() => {
      expect(actions.sendBankInfoReminder).toHaveBeenCalledWith(12);
    });
  });

  it('hides finance refund actions for support-only viewers and shows handoff notice', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING' as any,
        bankInfo: {
          available: true,
          bankAccountId: 55,
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '123456789',
          accountHolder: 'Nguyen Van A',
          accountNumberMasked: '****6789',
          source: 'Hồ sơ khách hàng',
          updatedAt: '2026-04-03T10:30:00.000Z',
          qrImageUrl: 'https://example.com/bank-qr.png',
        },
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        canManageRefundWorkflow={false}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Bước hoàn tiền đang chờ bộ phận tài chính xử lý.')).toBeInTheDocument();
    expect(screen.queryByText('Thông tin nhận hoàn tiền')).not.toBeInTheDocument();
    expect(screen.queryByText('Vietcombank')).not.toBeInTheDocument();
    expect(screen.queryByText('123456789')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đặt lại chờ hoàn tiền' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đang hoàn tiền' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu hoàn tiền lỗi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chuyển kiểm tra thủ công' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tiếp tục tới hoàn tiền' })).not.toBeInTheDocument();
  });

  it('requires and trims note for refund failed action', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PROCESSING' as any,
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh dấu hoàn tiền lỗi' }));

    expect(screen.getByText('Lý do hoàn tiền lỗi')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận cập nhật' });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Nhập lý do hoàn tiền lỗi...'), '  Cổng thanh toán trả lỗi timeout  ');
    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(actions.setRefundFailed).toHaveBeenCalledWith(12, 'Cổng thanh toán trả lỗi timeout');
    });
  });

  it('requires and trims note for manual review action', async () => {
    const actions = createMockReviewActions();
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'ACCEPTED_FOR_REFUND' as any,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED' as any,
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={actions}
        item={createReturnItem({
          status: 'ACCEPTED_FOR_REFUND' as any,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'FAILED' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Chuyển kiểm tra thủ công' }));

    expect(screen.getByText('Lý do kiểm tra thủ công')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận cập nhật' });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Nhập lý do cần kiểm tra thủ công...'), '  Cần đối soát với cổng thanh toán  ');
    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(actions.setRefundManualReview).toHaveBeenCalledWith(12, 'Cần đối soát với cổng thanh toán');
    });
  });

  it('treats completed legacy status as terminal and hides action footer', async () => {
    detailMock.mockResolvedValueOnce(createReturnItem({ status: 'COMPLETED' as any }));

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem({ status: 'COMPLETED' as any })}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledWith(12);
    });

    expect(screen.queryByRole('button', { name: 'Từ chối yêu cầu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt yêu cầu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chấp nhận & Hoàn tiền' })).not.toBeInTheDocument();
  });

  it('shows refund lock messaging and hides refund actions when refund is locked', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        status: 'PENDING_PAYMENT_CONFIRMATION' as any,
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED' as any,
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem({
          status: 'PENDING_PAYMENT_CONFIRMATION' as any,
          refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED' as any,
        })}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Trạng thái hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Khóa tới khi xác nhận thanh toán')).toBeInTheDocument();
    expect(
      screen.getByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Đang chờ khách xác nhận đã nhận hàng để hệ thống mở khóa bước hoàn tiền.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt yêu cầu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tiếp tục tới hoàn tiền' })).not.toBeInTheDocument();
  });

  it('opens and closes the proof image lightbox', async () => {
    detailMock.mockResolvedValueOnce(
      createReturnItem({
        proofImages: ['https://cdn.example.com/proof-2.jpg'],
      }),
    );

    render(
      <AdminReturnReviewModal
        actions={createMockReviewActions()}
        item={createReturnItem()}
        onClose={vi.fn()}
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
