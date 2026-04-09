import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const updateItemMock = vi.fn();
const removeItemMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'summary.title' && options?.count !== undefined) {
        return `summary.title.${options.count}`;
      }
      return key;
    },
  }),
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/common/components/CheckoutProgress', () => ({
  CheckoutProgress: () => <div data-testid="checkout-progress" />,
}));

vi.mock('@/common/components/OrderSummaryRail', () => ({
  OrderSummaryRail: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/common/utils/currency', () => ({
  formatCurrencyVND: (value: number) => `${value} VND`,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1 },
  }),
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: (...args: unknown[]) => showToastMock(...args),
  }),
}));

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => ({
    items: [
      {
        cartItemId: 99,
        quantity: 1,
        variant: {
          variantId: 11,
          price: 150000,
          sku: 'SKU-11',
          product: {
            productId: 55,
            name: 'Aura Dress',
            slug: 'aura-dress',
            images: [{ imageUrl: '/dress.jpg', thumbnailUrl: '/dress-thumb.jpg' }],
          },
        },
      },
    ],
    updateItem: (...args: unknown[]) => updateItemMock(...args),
    removeItem: (...args: unknown[]) => removeItemMock(...args),
  }),
}));

import { ShoppingBag } from '@/common/pages/ShoppingBag';

describe('ShoppingBag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows decrementing quantity to zero so CartContext can remove the item', async () => {
    const user = userEvent.setup();

    render(<ShoppingBag />);

    const buttons = screen.getAllByRole('button');
    const decrementButton = buttons.find((button) =>
      button.querySelector('.material-symbols-outlined')?.textContent === 'remove',
    );

    expect(decrementButton).toBeDefined();

    await user.click(decrementButton!);

    expect(updateItemMock).toHaveBeenCalledWith(99, 0);
    expect(removeItemMock).not.toHaveBeenCalled();
  });
});
