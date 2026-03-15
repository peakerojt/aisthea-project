import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Products } from '@/admin/pages/Products';

const refreshProducts = vi.fn();

const useProductsPageAPI = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/common/hooks/useProducts', () => ({
  useProductsPageAPI: (...args: any[]) => useProductsPageAPI(...args),
  useUpdateProductMutation: () => ({
    mutateAsync: vi.fn(),
  }),
  useDeleteProductMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/common/services/product.service', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
  deleteProductById: vi.fn(),
}));

describe('Products page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps existing rows visible during background refetch', async () => {
    useProductsPageAPI.mockReturnValue({
      data: {
        data: [
          {
            productId: 10,
            name: 'Ao khoac',
            basePrice: 299000,
            status: 'Active',
            category: { name: 'Outerwear', slug: 'outerwear' },
            images: [{ imageUrl: 'https://cdn.example.com/image.jpg', isPrimary: true }],
            variants: [{ sku: 'SKU-10', price: 299000, stockQuantity: 12, isDefault: true }],
          },
        ],
        meta: { total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: refreshProducts,
    });

    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ao khoac')).toBeInTheDocument();
    expect(screen.queryByText('products:loading')).not.toBeInTheDocument();
  });
});
