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
  useLocation: () => ({
    state: { totalAmount: 321000 },
  }),
}));

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => ({
    cartTotal: 0,
  }),
}));

import PaymentQR from '@/common/pages/PaymentQR';

describe('PaymentQR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nMode.rawKeys = false;
  });

  it('keeps payment QR chrome readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(<PaymentQR />);

    expect(screen.getByText('Thanh toán bằng mã QR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đổi phương thức/i })).toBeInTheDocument();
    expect(screen.getByAltText('Mã QR thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Tổng thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Thời gian còn lại')).toBeInTheDocument();
    expect(screen.getByText('Hướng dẫn thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Tải ứng dụng')).toBeInTheDocument();
    expect(screen.getByText('Mở ứng dụng và chọn tính năng quét mã QR.')).toBeInTheDocument();
    expect(screen.getByText('Ngân hàng hỗ trợ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tôi đã quét xong' })).toBeInTheDocument();
  });
});
