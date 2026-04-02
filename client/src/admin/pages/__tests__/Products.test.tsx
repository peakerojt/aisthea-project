import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Products } from '@/admin/pages/Products';

const refreshProducts = vi.fn();

const useProductsPageAPI = vi.fn();
const mutateAsyncMock = vi.fn();

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/common/hooks/useProducts', () => ({
  useProductsPageAPI: (...args: any[]) => useProductsPageAPI(...args),
  useUpdateProductStatusMutation: () => ({
    mutateAsync: (...args: any[]) => mutateAsyncMock(...args),
  }),
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
    mutateAsyncMock.mockResolvedValue({});
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

  it('restores hidden products back to active when the visibility action is clicked again', async () => {
    useProductsPageAPI.mockReturnValue({
      data: {
        data: [
          {
            productId: 11,
            name: 'Giay boot Vintage',
            basePrice: 1628000,
            status: 'Archived',
            category: { name: 'Giay dep', slug: 'giay-dep' },
            images: [{ imageUrl: 'https://cdn.example.com/boot.jpg', isPrimary: true }],
            variants: [{ sku: 'SKU-11', price: 1628000, stockQuantity: 50, isDefault: true }],
          },
        ],
        meta: { total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refreshProducts,
    });

    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Giay boot Vintage')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'products:modal.restore' }));

    expect(screen.getByText('products:modal.restoreTitle')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'products:modal.restore' })[1]);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 11,
      status: 'Active',
    });
  });
});
