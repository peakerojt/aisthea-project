import { useState, useCallback } from 'react';
import { fetchItems, reorderItems, Item } from '@/common/services/items.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = ['items'] as const;

/**
 * useReorderItems
 *
 * Manages: fetching, optimistic reorder, server sync, and error rollback.
 * Optimistic update: we apply the reorder locally immediately for a snappy UI,
 * then confirm (or rollback) once the server responds.
 */
export function useReorderItems() {
    const queryClient = useQueryClient();
    const [reorderError, setReorderError] = useState<string | null>(null);

    // Fetch
    const { data: items = [], isLoading, isError, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchItems,
        staleTime: 30_000,
    });

    // Mutation with optimistic update + rollback
    const mutation = useMutation({
        mutationFn: reorderItems,

        // Snapshot + optimistic apply
        onMutate: async ({ itemId, fromIndex, toIndex }) => {
            // Cancel any in-flight queries so they don't overwrite our optimistic state
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });

            const snapshot = queryClient.getQueryData<Item[]>(QUERY_KEY) ?? [];

            // Apply reorder locally
            const next = [...snapshot];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            queryClient.setQueryData(QUERY_KEY, next);

            setReorderError(null);
            return { snapshot }; // context for onError
        },

        // Server confirmed — refetch to stay in sync
        onSuccess: (serverItems) => {
            queryClient.setQueryData(QUERY_KEY, serverItems);
        },

        // Rollback to snapshot and show error
        onError: (err: unknown, _vars: unknown, context: unknown) => {
            const typedContext = context as { snapshot?: Item[] } | undefined;
            if (typedContext?.snapshot) {
                queryClient.setQueryData(QUERY_KEY, typedContext.snapshot);
            }
            const error = err as Error & { response?: { data?: { message?: string } } };
            const message =
                error?.response?.data?.message ?? error?.message ?? 'Reorder failed. Please try again.';
            setReorderError(message);
        },
    });

    const reorder = useCallback(
        (itemId: number, fromIndex: number, toIndex: number) =>
            mutation.mutate({ itemId, fromIndex, toIndex }),
        [mutation],
    );

    return {
        items,
        isLoading,
        isError,
        fetchError: error,
        reorderError,
        isReordering: mutation.isPending,
        reorder,
        clearError: () => setReorderError(null),
    };
}
