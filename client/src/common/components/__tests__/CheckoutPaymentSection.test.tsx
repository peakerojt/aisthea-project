import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutPaymentSection } from '@/common/components/CheckoutPaymentSection';

describe('CheckoutPaymentSection', () => {
  it('keeps payment section chrome readable when translations return raw keys', () => {
    const t = vi.fn((key: string) => key) as any;

    render(
      <CheckoutPaymentSection
        formData={{
          email: '',
          fullName: '',
          phone: '',
          address: '',
          city: '',
          district: '',
          ward: '',
          note: '',
          paymentMethod: 'VNPAY',
        }}
        handleInputChange={vi.fn()}
        t={t}
        vnpayLogo="/vnpay.png"
      />,
    );

    expect(screen.getByText('Thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Chọn phương thức thanh toán phù hợp cho đơn hàng của bạn.')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán qua VNPAY')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán khi nhận hàng')).toBeInTheDocument();
    expect(screen.getByAltText('VNPAY')).toBeInTheDocument();
  });
});
