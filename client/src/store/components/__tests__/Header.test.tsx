import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const useAuthMock = vi.fn();
const useCartMock = vi.fn();
const fetchProductsMock = vi.fn();

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => useCartMock(),
}));

vi.mock('@/common/services/product.service', () => ({
  fetchProducts: (...args: unknown[]) => fetchProductsMock(...args),
}));

vi.mock('@/common/utils/cloudinary', () => ({
  getCloudinaryProductCard: (url: string) => url,
}));

vi.mock('@/common/utils/search', () => ({
  matchesSearchQuery: () => false,
}));

vi.mock('@/common/components/Logo', () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { Header } from '@/store/components/Header';

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartMock.mockReturnValue({ totalItems: 0 });
    fetchProductsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('sends support users to admin returns from the account button', async () => {
    useAuthMock.mockReturnValue({
      user: { roles: ['Support'], name: 'Support User' },
      role: 'staff',
    });

    render(<Header />);

    await userEvent.click(screen.getByTitle('Hồ sơ'));

    expect(navigateMock).toHaveBeenCalledWith('/admin/returns');
  });
});
