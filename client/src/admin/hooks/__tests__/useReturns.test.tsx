import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';
import { RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS } from '@/common/utils/returnRefresh';

vi.mock('@/common/utils/returnRefresh', async () => {
  const actual = await vi.importActual<any>('@/common/utils/returnRefresh');
  return {
    ...actual,
    RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS: 10,
  };
});

const showToastMock = vi.fn();
const listMock = vi.fn();
const adminAcceptForRefundMock = vi.fn();
const adminApproveMock = vi.fn();
const adminCompleteRefundMock = vi.fn();
const adminMarkInTransitMock = vi.fn();
const adminMarkReceivedMock = vi.fn();
const adminRejectMock = vi.fn();
const adminSetRefundPendingMock = vi.fn();
const adminSetRefundProcessingMock = vi.fn();
const adminSetRefundFailedMock = vi.fn();
const adminSetRefundManualReviewMock = vi.fn();

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (key === 'feedback.refundSuccess') {
          return 'Đã hoàn tiền thành công';
        }
        if (key === 'feedback.receivedSuccess') {
          return 'Đã đánh dấu nhận hàng';
        }
        if (key === 'feedback.refundRejected') {
          return 'Yêu cầu đã bị từ chối, không thể hoàn tiền.';
        }
        if (key === 'feedback.refundWorkflowForbidden') {
          return 'Chỉ quản trị viên được phép xử lý bước hoàn tiền.';
        }
        if (key === 'feedback.returnWorkflowForbidden') {
          return 'Bạn không có quyền xử lý quy trình trả hàng.';
        }
        return key;
      },
      i18n: { changeLanguage: vi.fn() },
    }),
  };
});

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

const useAuthMock = vi.fn();

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const makeReturn = (overrides?: Record<string, unknown>) => ({
  returnId: 1,
  orderId: 101,
  userId: 10,
  reason: 'DEFECTIVE',
  proofImages: [],
  status: 'REQUESTED',
  adminNote: null,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

let useAdminReturns: typeof import('@/admin/hooks/useReturns').useAdminReturns;

vi.mock('@/admin/services', () => ({
  adminReturnReviewService: {
    adminAcceptForRefund: (...args: unknown[]) => adminAcceptForRefundMock(...args),
    adminApprove: (...args: unknown[]) => adminApproveMock(...args),
    adminCompleteRefund: (...args: unknown[]) => adminCompleteRefundMock(...args),
    adminMarkInTransit: (...args: unknown[]) => adminMarkInTransitMock(...args),
    adminMarkReceived: (...args: unknown[]) => adminMarkReceivedMock(...args),
    adminReject: (...args: unknown[]) => adminRejectMock(...args),
    list: (...args: unknown[]) => listMock(...args),
    adminSetRefundPending: (...args: unknown[]) => adminSetRefundPendingMock(...args),
    adminSetRefundProcessing: (...args: unknown[]) => adminSetRefundProcessingMock(...args),
    adminSetRefundFailed: (...args: unknown[]) => adminSetRefundFailedMock(...args),
    adminSetRefundManualReview: (...args: unknown[]) => adminSetRefundManualReviewMock(...args),
  },
}));

describe('useAdminReturns', () => {
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeAll(async () => {
    ({ useAdminReturns } = await import('@/admin/hooks/useReturns'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockReset();
    adminAcceptForRefundMock.mockReset();
    adminApproveMock.mockReset();
    adminCompleteRefundMock.mockReset();
    adminMarkInTransitMock.mockReset();
    adminMarkReceivedMock.mockReset();
    adminRejectMock.mockReset();
    adminSetRefundPendingMock.mockReset();
    adminSetRefundProcessingMock.mockReset();
    adminSetRefundFailedMock.mockReset();
    adminSetRefundManualReviewMock.mockReset();
    useAuthMock.mockReturnValue({
      role: 'admin',
      user: { roles: ['Admin'] },
    });
    vi.useRealTimers();
  });

  afterEach(() => {
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    }
  });

  it('loads returns on mount and computes tab counts', async () => {
    listMock.mockResolvedValue({
      returns: [
        makeReturn({ returnId: 1, status: 'PENDING_APPROVAL' }),
        makeReturn({ returnId: 2, status: 'COMPLETED' }),
        makeReturn({ returnId: 3, status: 'APPROVED' }),
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 3,
        totalPages: 4,
      },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.returns).toHaveLength(3);
    });

    expect(listMock).toHaveBeenCalledWith({ status: 'ALL', page: 1, pageSize: 15 });
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.statusTabs).toEqual([
      { key: 'ALL', label: 'Tất cả', count: 3 },
      { key: 'REQUESTED', label: 'Chờ duyệt', count: 1 },
      { key: 'APPROVED', label: 'Đã duyệt', count: 1 },
      { key: 'REJECTED', label: 'Đã từ chối', count: 0 },
      { key: 'RECEIVED', label: 'Đã nhận hàng', count: 0 },
      { key: 'REFUNDED', label: 'Đã hoàn tiền', count: 1 },
    ]);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.canManageReturnWorkflow).toBe(true);
    expect(result.current.canManageRefundWorkflow).toBe(true);
  });

  it('keeps return workflow enabled but refund workflow disabled for staff sessions', async () => {
    useAuthMock.mockReturnValue({
      role: 'staff',
      user: { roles: ['Support'] },
    });
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 30, workflowStatus: 'ACCEPTED_FOR_REFUND' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canManageReturnWorkflow).toBe(true);
    expect(result.current.canManageRefundWorkflow).toBe(false);
  });

  it('does not grant refund workflow to staff sessions even with legacy finance permissions', async () => {
    useAuthMock.mockReturnValue({
      role: 'staff',
      user: {
        roles: ['Support'],
        permissions: ['RETURN_REFUND_FINANCE_COMPLETE'],
      },
    });
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 31, workflowStatus: 'ACCEPTED_FOR_REFUND' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canManageReturnWorkflow).toBe(true);
    expect(result.current.canManageRefundWorkflow).toBe(false);
  });

  it('uses the explicit status bucket when the admin read model carries both raw and bucket statuses', async () => {
    listMock.mockResolvedValue({
      returns: [
        makeReturn({
          returnId: 4,
          status: 'PENDING_APPROVAL',
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          statusBucket: 'RECEIVED',
        }),
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.returns).toHaveLength(1);
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.statusTabs).toEqual([
      { key: 'ALL', label: 'Tất cả', count: 1 },
      { key: 'REQUESTED', label: 'Chờ duyệt', count: 0 },
      { key: 'APPROVED', label: 'Đã duyệt', count: 0 },
      { key: 'REJECTED', label: 'Đã từ chối', count: 0 },
      { key: 'RECEIVED', label: 'Đã nhận hàng', count: 1 },
      { key: 'REFUNDED', label: 'Đã hoàn tiền', count: 0 },
    ]);
  });

  it('resets page and reloads when status filter changes', async () => {
    listMock
      .mockResolvedValueOnce({
        returns: [makeReturn({ returnId: 1, status: 'REQUESTED' })],
        pagination: { page: 3, pageSize: 15, total: 1, totalPages: 3 },
      })
      .mockResolvedValueOnce({
        returns: [makeReturn({ returnId: 2, status: 'APPROVED' })],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith({ status: 'ALL', page: 3, pageSize: 15 });
    });

    act(() => {
      result.current.changeStatusFilter('APPROVED');
    });

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith({ status: 'APPROVED', page: 1, pageSize: 15 });
    });

    expect(result.current.page).toBe(1);
    expect(result.current.statusFilter).toBe('APPROVED');
  });

  it('shows success toast, clears selection, and reloads after complete refund succeeds', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 10, status: 'REFUNDED' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    adminCompleteRefundMock.mockResolvedValue({ messageKey: 'feedback.refundSuccess' });
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedReturn(result.current.returns[0]);
    });

    act(() => {
      void result.current.reviewActions.refund(10);
    });

    await waitFor(() => {
      expect(adminCompleteRefundMock).toHaveBeenCalledWith(10, undefined);
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'success',
        title: 'Đã hoàn tiền thành công',
      });
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RETURN_SUMMARY_CHANGED_EVENT,
          detail: {
            orderId: 101,
            returnRequestId: 10,
          },
        }),
      );
      expect(result.current.selectedReturn).toBeNull();
      expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    dispatchEventSpy.mockRestore();
  });

  it('passes through explicit workflow actions and translates success keys', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 11, status: 'RECEIVED' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    adminMarkReceivedMock.mockResolvedValue({ messageKey: 'feedback.receivedSuccess' });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.reviewActions.markReceived(11);
    });

    await waitFor(() => {
      expect(adminMarkReceivedMock).toHaveBeenCalledWith(11);
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'success',
        title: 'Đã đánh dấu nhận hàng',
      });
    });
  });

  it('routes refund-status actions through the narrow admin alias methods', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 12, status: 'ACCEPTED_FOR_REFUND', refundStatus: 'PENDING' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    adminSetRefundProcessingMock.mockResolvedValue({ messageKey: 'feedback.refundStatusProcessingSuccess' });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.reviewActions.setRefundProcessing(12);
    });

    await waitFor(() => {
      expect(adminSetRefundProcessingMock).toHaveBeenCalledWith(12);
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'success',
        title: 'feedback.refundStatusProcessingSuccess',
      });
    });
  });

  it('keeps the selected return open after manual-review finance actions succeed', async () => {
    listMock
      .mockResolvedValueOnce({
        returns: [makeReturn({ returnId: 12, status: 'ACCEPTED_FOR_REFUND', workflowStatus: 'ACCEPTED_FOR_REFUND', refundStatus: 'PENDING' })],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        returns: [makeReturn({ returnId: 12, status: 'ACCEPTED_FOR_REFUND', workflowStatus: 'ACCEPTED_FOR_REFUND', refundStatus: 'MANUAL_REVIEW' })],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      });
    adminSetRefundManualReviewMock.mockResolvedValue({ messageKey: 'feedback.refundStatusManualReviewSuccess' });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedReturn(result.current.returns[0]);
    });

    act(() => {
      void result.current.reviewActions.setRefundManualReview(12, 'Cần đối soát với cổng thanh toán');
    });

    await waitFor(() => {
      expect(adminSetRefundManualReviewMock).toHaveBeenCalledWith(12, 'Cần đối soát với cổng thanh toán');
      expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    await waitFor(() => {
      expect(result.current.selectedReturn?.returnId).toBe(12);
      expect(result.current.selectedReturn?.refundStatus).toBe('MANUAL_REVIEW');
    });
  });

  it('shows error toast when a semantic review action fails', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn()],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    adminRejectMock.mockRejectedValue(new Error('Không thể xử lý yêu cầu'));

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.reviewActions.reject(1, 'Lý do');
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Không thể xử lý yêu cầu',
      });
    });
  });

  it('uses translated error message keys when a semantic review action fails with a keyed error', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn()],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    adminCompleteRefundMock.mockRejectedValue(
      Object.assign(new Error('fallback'), { messageKey: 'feedback.refundRejected' }),
    );

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.reviewActions.refund(1);
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Yêu cầu đã bị từ chối, không thể hoàn tiền.',
      });
    });
  });

  it('blocks refund-only actions at the hook layer for staff sessions before any API call', async () => {
    useAuthMock.mockReturnValue({
      role: 'staff',
      user: { roles: ['Support'] },
    });
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 52, workflowStatus: 'ACCEPTED_FOR_REFUND', refundStatus: 'PENDING' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.reviewActions.refund(52);
    });

    await waitFor(() => {
      expect(adminCompleteRefundMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Chỉ quản trị viên được phép xử lý bước hoàn tiền.',
      });
    });
  });

  it('polls refund-active admin returns and keeps the selected return in sync', async () => {
    listMock
      .mockResolvedValueOnce({
        returns: [
          makeReturn({
            returnId: 21,
            status: 'ACCEPTED_FOR_REFUND',
            workflowStatus: 'ACCEPTED_FOR_REFUND',
            refundStatus: 'PROCESSING',
            financeNote: null,
          }),
        ],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        returns: [
          makeReturn({
            returnId: 21,
            status: 'ACCEPTED_FOR_REFUND',
            workflowStatus: 'ACCEPTED_FOR_REFUND',
            refundStatus: 'FAILED',
            financeNote: 'Cổng thanh toán đang được kiểm tra lại.',
          }),
        ],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });
    expect(listMock).toHaveBeenNthCalledWith(1, {
      status: 'ALL',
      page: 1,
      pageSize: 15,
    });

    act(() => {
      result.current.setSelectedReturn(result.current.returns[0]);
    });

    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20,
    });

    expect(result.current.returns[0]?.refundStatus).toBe('FAILED');
    expect(result.current.selectedReturn).toEqual(
      expect.objectContaining({
        returnId: 21,
        refundStatus: 'FAILED',
        financeNote: 'Cổng thanh toán đang được kiểm tra lại.',
      }),
    );
  });

  it('polls locked COD returns until they are unlocked for admin review', async () => {
    listMock
      .mockResolvedValueOnce({
        returns: [
          makeReturn({
            returnId: 22,
            status: 'PENDING_PAYMENT_CONFIRMATION',
            workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
            refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
          }),
        ],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        returns: [
          makeReturn({
            returnId: 22,
            status: 'PENDING_ADMIN_REVIEW',
            workflowStatus: 'PENDING_ADMIN_REVIEW',
            refundStatus: 'NOT_APPLICABLE',
          }),
        ],
        pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
      });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedReturn(result.current.returns[0]);
    });

    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20,
    });

    expect(result.current.returns[0]).toEqual(
      expect.objectContaining({
        returnId: 22,
        refundStatus: 'NOT_APPLICABLE',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
      }),
    );
    expect(result.current.selectedReturn).toEqual(
      expect.objectContaining({
        returnId: 22,
        refundStatus: 'NOT_APPLICABLE',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
      }),
    );
  });

});
