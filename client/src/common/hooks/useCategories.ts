import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchCategoryTree,
    fetchCategoryFlat,
    createCategory,
    updateCategory,
    deleteCategory,
    CategoryNode,
    CategoryFlat,
    CreateCategoryPayload,
    UpdateCategoryPayload,
} from '@/common/services/category.service';

export const categoryKeys = {
    all: ['categories'] as const,
    tree: () => [...categoryKeys.all, 'tree'] as const,
    flat: () => [...categoryKeys.all, 'flat'] as const,
};

/** Fetch full category tree (for navigation, storefront) */
export const useCategoryTree = () => {
    return useQuery<CategoryNode[]>({
        queryKey: categoryKeys.tree(),
        queryFn: fetchCategoryTree,
        staleTime: 10 * 60 * 1000, // 10 minutes — categories rarely change
    });
};

/** Fetch flat category list (for admin selects, breadcrumbs) */
export const useCategoryFlat = () => {
    return useQuery<CategoryFlat[]>({
        queryKey: categoryKeys.flat(),
        queryFn: fetchCategoryFlat,
        staleTime: 10 * 60 * 1000,
    });
};

/** Admin: create a new category */
export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

/** Admin: update an existing category */
export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateCategoryPayload }) =>
            updateCategory(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};

/** Admin: delete a category */
export const useDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteCategory(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    });
};
