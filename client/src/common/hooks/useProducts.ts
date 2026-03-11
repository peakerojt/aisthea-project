import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, fetchProductById, createProduct, updateProduct, deleteProductById, ProductFilters, Product } from '@/common/services/product.service';

export const productKeys = {
    all: ['products'] as const,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (filters: ProductFilters) => [...productKeys.lists(), { filters }] as const,
    details: () => [...productKeys.all, 'detail'] as const,
    detail: (id: number) => [...productKeys.details(), id] as const,
};

export const useProductsAPI = () => {
    return useQuery({
        queryKey: productKeys.lists(),
        queryFn: () => fetchProducts(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useFilteredProducts = (filters: ProductFilters) => {
    return useQuery({
        queryKey: productKeys.list(filters),
        queryFn: () => fetchProducts(filters),
        enabled: !!filters,
    });
};

export const useProductDetail = (id: number) => {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => fetchProductById(id),
        enabled: !!id,
    });
};

export const useCreateProductMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof createProduct>[0]) => createProduct(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.all });
        },
    });
};

export const useUpdateProductMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateProduct>[1] }) => updateProduct(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        },
    });
};

export const useDeleteProductMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteProductById(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.all });
        },
    });
};
