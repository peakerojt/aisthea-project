import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Home } from '@/store/pages/Home';

const navigate = vi.fn();

const mockProducts = [
  {
    productId: 1,
    name: 'Structured Jacket',
    basePrice: 820000,
    images: [{ imageUrl: 'https://example.com/jacket.jpg', thumbnailUrl: 'https://example.com/jacket-thumb.jpg' }],
    category: { name: 'Men Jacket' },
    variants: [{ price: 820000, stockQuantity: 8 }],
  },
  {
    productId: 2,
    name: 'Minimal Dress',
    basePrice: 760000,
    images: [{ imageUrl: 'https://example.com/dress.jpg', thumbnailUrl: 'https://example.com/dress-thumb.jpg' }],
    category: { name: 'Women Dress' },
    variants: [{ price: 760000, stockQuantity: 5 }],
  },
  {
    productId: 3,
    name: 'Clean Polo',
    basePrice: 540000,
    images: [{ imageUrl: 'https://example.com/polo.jpg', thumbnailUrl: 'https://example.com/polo-thumb.jpg' }],
    category: { name: 'Men Polo' },
    variants: [{ price: 540000, stockQuantity: 12 }],
  },
  {
    productId: 4,
    name: 'Seasonal Tee',
    basePrice: 390000,
    images: [{ imageUrl: 'https://example.com/tee.jpg', thumbnailUrl: 'https://example.com/tee-thumb.jpg' }],
    category: { name: 'Unisex Tee' },
    variants: [{ price: 390000, stockQuantity: 14 }],
  },
];

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, string>) => {
        if (key === 'trending.label' && options?.month) {
          return `trending.label:${options.month}`;
        }

        return key;
      },
    }),
  };
});

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/ChatWidget', () => ({
  ChatWidget: () => <div data-testid="chat-widget" />,
}));

vi.mock('@/common/components/ProductCard', () => ({
  ProductCard: ({ name }: { name: string }) => <div data-testid="product-card">{name}</div>,
}));

vi.mock('@/common/hooks/useProducts', () => ({
  useProductsAPI: () => ({
    data: mockProducts,
    isLoading: false,
  }),
}));

describe('Home', () => {
  it('renders the refreshed landing structure with key sections and product cards', async () => {
    render(<Home />);

    expect(screen.getByTestId('store-header')).toBeInTheDocument();
    expect(screen.getByText('hero.ctaSecondary')).toBeInTheDocument();
    expect(screen.getByText('trending.heading')).toBeInTheDocument();
    expect(screen.getByText('category.title')).toBeInTheDocument();
    expect(screen.getByText('styling.titleLine1')).toBeInTheDocument();
    expect(screen.getAllByTestId('product-card')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý chat' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
    });
  });

  it('routes category quick links to stable collection paths', () => {
    window.scrollTo = vi.fn();

    render(<Home />);

    fireEvent.click(screen.getByText('category.cards.men.links.tailoring'));

    expect(navigate).toHaveBeenCalledWith('/collection/men/outerwear');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
