import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupportPage from '@/store/pages/SupportPage';

const navigate = vi.fn();
const setSearchParams = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams('section=returns'), setSearchParams],
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/ChatWidget', () => ({
  ChatWidget: () => <div data-testid="chat-widget" />,
}));

describe('SupportPage', () => {
  it('renders support returns content with safe fallback labels', () => {
    render(<SupportPage />);

    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getAllByText('Chính sách đổi trả').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Hỗ trợ đổi/trả trong vòng 7 ngày nếu sản phẩm còn nguyên tem và chưa qua sử dụng.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng liên hệ hotline hoặc email để được hướng dẫn quy trình trả hàng.')).toBeInTheDocument();
    expect(screen.getByText('Liên hệ')).toBeInTheDocument();
    expect(screen.getByText('Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng')).toBeInTheDocument();
  });
});
