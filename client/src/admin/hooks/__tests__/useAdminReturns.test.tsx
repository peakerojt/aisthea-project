import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const showToastMock = vi.fn();
const listMock = vi.fn();
const processMock = vi.fn();

vi.unmock('@/common/services/return.service');

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (key === 'feedback.refundSuccess') {
          return 'Đã hoàn tiền thành công';
        }
        if (key === 'feedback.refundRejected') {
          return 'Yêu cầu đã bị từ chối, không thể hoàn tiền.';
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

let useAdminReturns: typeof import('@/admin/hooks/useAdminReturns').useAdminReturns;
let adminReturnService: typeof import('@/common/services/return.service').adminReturnService;

describe('useAdminReturns', () => {
  beforeAll(async () => {
    ({ useAdminReturns } = await import('@/admin/hooks/useAdminReturns'));
    ({ adminReturnService } = await import('@/common/services/return.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockReset();
    processMock.mockReset();
    vi.spyOn(adminReturnService, 'list').mockImplementation((...args) => listMock(...args));
    vi.spyOn(adminReturnService, 'process').mockImplementation((...args) => processMock(...args));
  });

  it('loads returns on mount and computes tab counts', async () => {
    listMock.mockResolvedValue({
      returns: [
        makeReturn({ returnId: 1, status: 'REQUESTED' }),
        makeReturn({ returnId: 2, status: 'APPROVED' }),
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 2,
        totalPages: 4,
      },
    });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.returns).toHaveLength(2);
    });

    expect(listMock).toHaveBeenCalledWith({ status: 'ALL', page: 1, pageSize: 15 });
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.statusTabs).toEqual([
      { key: 'ALL', label: 'Tất cả', count: 2 },
      { key: 'REQUESTED', label: 'Chờ duyệt', count: 1 },
      { key: 'APPROVED', label: 'Đã duyệt', count: 1 },
      { key: 'REJECTED', label: 'Đã từ chối', count: 0 },
      { key: 'RECEIVED', label: 'Đã nhận hàng', count: 0 },
      { key: 'REFUNDED', label: 'Đã hoàn tiền', count: 0 },
    ]);
    expect(result.current.totalPages).toBe(4);
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

  it('shows success toast, clears selection, and reloads after action succeeds', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn({ returnId: 10, status: 'REFUNDED' })],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    processMock.mockResolvedValue({ messageKey: 'feedback.refundSuccess' });

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedReturn(result.current.returns[0]);
    });

    act(() => {
      void result.current.handleAction(10, 'COMPLETE_REFUND');
    });

    await waitFor(() => {
      expect(processMock).toHaveBeenCalledWith(10, 'COMPLETE_REFUND', undefined);
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'success',
        title: 'Đã hoàn tiền thành công',
      });
      expect(result.current.selectedReturn).toBeNull();
      expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows error toast when action fails', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn()],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    processMock.mockRejectedValue(new Error('Không thể xử lý yêu cầu'));

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.handleAction(1, 'REJECT', 'Lý do');
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Không thể xử lý yêu cầu',
      });
    });
  });

  it('uses translated error message keys when action fails with a keyed error', async () => {
    listMock.mockResolvedValue({
      returns: [makeReturn()],
      pagination: { page: 1, pageSize: 15, total: 1, totalPages: 1 },
    });
    processMock.mockRejectedValue(
      Object.assign(new Error('fallback'), { messageKey: 'feedback.refundRejected' }),
    );

    const { result } = renderHook(() => useAdminReturns());

    await waitFor(() => {
      expect(result.current.returns).toHaveLength(1);
    });

    act(() => {
      void result.current.handleAction(1, 'COMPLETE_REFUND');
    });

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'error',
        title: 'Yêu cầu đã bị từ chối, không thể hoàn tiền.',
      });
    });
  });
});
