import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const showToastMock = vi.fn();
const getRefundBenefitsMock = vi.fn();

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/store/services/user.service', () => ({
  userService: {
    getRefundBenefits: (...args: unknown[]) => getRefundBenefitsMock(...args),
  },
}));

let ProfileRefundBenefitsSection: typeof import('@/store/components/profile/ProfileRefundBenefitsSection').ProfileRefundBenefitsSection;

describe('ProfileRefundBenefitsSection', () => {
  beforeAll(async () => {
    ({ ProfileRefundBenefitsSection } = await import('@/store/components/profile/ProfileRefundBenefitsSection'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders skeleton cards instead of loading text while fetching benefits', () => {
    getRefundBenefitsMock.mockReturnValue(new Promise(() => undefined));

    const { container } = render(<ProfileRefundBenefitsSection />);

    expect(screen.queryByText('Đang tải ưu đãi hoàn tiền...')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders refund benefits without exposing the hidden coupon code', async () => {
    getRefundBenefitsMock.mockResolvedValueOnce([
      {
        refundBenefitId: 1,
        returnRequestId: 55,
        orderId: 101,
        benefitType: 'PERCENTAGE',
        percentValue: 10,
        maxDiscountAmount: 50000,
        minOrderValue: 300000,
        status: 'ACTIVE',
        validFrom: '2026-04-01T00:00:00.000Z',
        validUntil: '2026-04-30T00:00:00.000Z',
        issuedAt: '2026-04-01T00:00:00.000Z',
        usedAt: null,
        summary: 'Available voucher 10%, max 50,000 VND',
        source: 'REFUND_BENEFIT',
        refundCompletedAt: '2026-04-01T00:00:00.000Z',
        couponCode: 'REFUND-SECRET-001',
      },
    ]);

    render(<ProfileRefundBenefitsSection />);

    expect(await screen.findByText('10%')).toBeInTheDocument();
    expect(screen.getByText('Tối đa 50.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Voucher giảm theo phần trăm')).toBeInTheDocument();
    expect(screen.getByText('Đơn tối thiểu')).toBeInTheDocument();
    expect(screen.getByText('300.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Hạn dùng')).toBeInTheDocument();
    expect(screen.getByText('1 ưu đãi')).toBeInTheDocument();
    expect(screen.queryByText('REFUND-SECRET-001')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nguồn tạo:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Voucher được ẩn khỏi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Available/i)).not.toBeInTheDocument();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
