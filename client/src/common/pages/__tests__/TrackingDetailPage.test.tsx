import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const getOrderTrackingMock = vi.fn();
const publicTrackingMock = vi.fn();
const navigateMock = vi.fn();
let trackingTranslationMode: 'translated' | 'raw' = 'translated';

vi.mock('@/common/services/tracking.service', () => ({
  getOrderTracking: (...args: unknown[]) => getOrderTrackingMock(...args),
  publicTracking: (...args: unknown[]) => publicTrackingMock(...args),
}));

vi.mock('@/common/hooks/useOrderTrackingRealtime', () => ({
  useOrderTrackingRealtime: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (trackingTranslationMode === 'raw') {
          return key;
        }

        const translations: Record<string, string> = {
          'status.PENDING': 'Chờ xác nhận',
          'status.PROCESSING': 'Đang xử lý',
          'status.SHIPPING': 'Đang giao hàng',
          'status.DELIVERED': 'Đã giao hàng',
          'status.RETURN_REQUESTED': 'Yêu cầu trả hàng',
          'status.RETURNED': 'Đã trả hàng',
          'page.loadingOrder': 'Đang tải thông tin đơn hàng...',
          'page.genericError': 'Có lỗi xảy ra',
          'page.lookupAgain': 'Tra cứu lại',
          'page.backToOrders': 'Quay lại đơn hàng',
          'page.newLookup': 'Tra cứu mới',
          'page.live': 'Theo dõi trực tiếp',
          'page.offline': 'Ngoại tuyến',
          'page.order': 'Đơn hàng',
          'page.orderCode': 'Mã đơn hàng',
          'page.shippingMode': 'Hình thức giao hàng',
          'page.shippingModeManual': 'Thủ công',
          'page.shippingModeProvider': 'Qua đối tác vận chuyển',
          'page.provider': 'Đối tác vận chuyển',
          'page.providerOrderCode': 'Mã đơn trên đối tác',
          'page.estimatedDelivery': 'Dự kiến giao hàng',
          'page.latestLocation': 'Vị trí gần nhất:',
          'page.history': 'Lịch sử đơn hàng',
          'page.emptyHistory': 'Chưa có cập nhật trạng thái nào.',
          'page.autoRefresh': 'Thông tin được cập nhật tự động khi có thay đổi. Không cần tải lại trang.',
          'errors.lookupRequired': 'Vui lòng nhập mã đơn hàng và số điện thoại để tra cứu.',
          'errors.loadTracking': 'Không thể tải dữ liệu theo dõi đơn hàng.',
        };

        if (key === 'page.orderItems') {
          return `Sản phẩm trong đơn (${String(options?.count ?? 0)})`;
        }

        return translations[key] ?? String(options?.defaultValue ?? key);
      },
    }),
  };
});

import { useTrackingStore } from '@/store/state/tracking.store';
import { TrackingDetailPage } from '@/common/pages/TrackingDetailPage';
import type { TrackingData } from '@/types/tracking';

const makeTracking = (overrides: Partial<TrackingData> = {}): TrackingData => ({
  orderId: 42,
  orderCode: 'ORD-42',
  trackingCode: 'TRK-42',
  currentStatus: 'RETURN_REQUESTED',
  eta: null,
  shippingMode: 'manual',
  shipment: null,
  items: [
    {
      orderItemId: 1,
      productName: 'Ao so mi',
      variantName: 'M',
      quantity: 1,
      unitPrice: 250000,
    },
  ],
  timeline: [
    {
      status: 'RETURN_REQUESTED',
      timestamp: '2026-03-25T10:00:00.000Z',
      note: 'Khach yeu cau tra hang',
    },
  ],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/tracking/42']}>
      <Routes>
        <Route path="/tracking/:id" element={<TrackingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TrackingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTrackingStore.setState({ tracking: null });
    trackingTranslationMode = 'translated';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders translated RETURN_REQUESTED labels from tracking data', async () => {
    getOrderTrackingMock.mockResolvedValueOnce(makeTracking());

    renderPage();

    await waitFor(() => {
      expect(getOrderTrackingMock).toHaveBeenCalledWith(42);
    });

    expect(await screen.findAllByText('Yêu cầu trả hàng')).toHaveLength(2);
    expect(screen.getByText('Lịch sử đơn hàng')).toBeInTheDocument();
  });

  it('uses translated fallback load error when request fails without a message', async () => {
    getOrderTrackingMock.mockRejectedValueOnce({});

    renderPage();

    expect(await screen.findByText('Có lỗi xảy ra')).toBeInTheDocument();
    expect(screen.getByText('Không thể tải dữ liệu theo dõi đơn hàng.')).toBeInTheDocument();
  });

  it('uses translated lookup-required message when tracking access is denied', async () => {
    getOrderTrackingMock.mockRejectedValueOnce({ response: { status: 404 } });

    renderPage();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/tracking', {
        state: { error: 'Vui lòng nhập mã đơn hàng và số điện thoại để tra cứu.' },
      });
    });
  });

  it('falls back to readable tracking labels when translations return raw keys', async () => {
    trackingTranslationMode = 'raw';
    getOrderTrackingMock.mockResolvedValueOnce(makeTracking());

    renderPage();

    await waitFor(() => {
      expect(getOrderTrackingMock).toHaveBeenCalledWith(42);
    });

    expect(await screen.findAllByText('Yêu cầu trả hàng')).toHaveLength(2);
    expect(screen.getByText('Quay lại đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Tra cứu mới')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm trong đơn (1)')).toBeInTheDocument();
    expect(screen.getByText('Thông tin được cập nhật tự động khi có thay đổi. Không cần tải lại trang.')).toBeInTheDocument();
  });
});
