import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.hoisted(() => vi.fn());
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      i18nMode.rawKeys ? key : (options?.defaultValue ?? key),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

import { CheckoutSummaryRail } from '@/common/components/CheckoutSummaryRail';

describe('CheckoutSummaryRail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nMode.rawKeys = false;
  });

  it('keeps summary rail chrome readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <CheckoutSummaryRail
        appliedCoupon={null}
        cart={[
          {
            id: 1,
            name: 'Ao so mi',
            image: '/shirt.jpg',
            quantity: 2,
            price: 150000,
            size: 'M',
            color: 'Trang',
          },
        ]}
        couponError=""
        couponSuccessMsg=""
        discountValue={0}
        handlePlaceOrder={vi.fn(async () => {})}
        handleRemoveCoupon={vi.fn()}
        isQuoteLoading={false}
        loading={false}
        onOpenCouponModal={vi.fn()}
        selectedCityCode="48"
        shippingFee={0}
        subtotal={300000}
        total={300000}
      />,
    );

    expect(screen.getByText('Đơn hàng (1 sản phẩm)')).toBeInTheDocument();
    expect(screen.getByText('Chọn hoặc nhập mã giảm giá')).toBeInTheDocument();
    expect(screen.getByText('Tạm tính')).toBeInTheDocument();
    expect(screen.getByText('Phí vận chuyển')).toBeInTheDocument();
    expect(screen.getByText('Miễn phí')).toBeInTheDocument();
    expect(screen.getByText('Tổng cộng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quay lại giỏ hàng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt hàng' })).toBeInTheDocument();
  });
});
