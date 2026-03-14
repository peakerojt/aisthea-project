import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, adminOrderService } from '@/common/services/order.service';

export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...orderKeys.lists(), { filters }] as const,
    details: () => [...orderKeys.all, 'detail'] as const,
    detail: (id: string | number) => [...orderKeys.details(), id] as const,
    admin: () => [...orderKeys.all, 'admin'] as const,
};

// ---- Storefront / User Hooks ----

export const useMyOrders = (params?: Parameters<typeof orderService.getMyOrders>[0]) => {
    return useQuery({
        queryKey: orderKeys.list(params || {}),
        queryFn: () => orderService.getMyOrders(params),
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

export const useMyOrderDetail = (id: string | number) => {
    return useQuery({
        queryKey: orderKeys.detail(id),
        queryFn: () => orderService.fetchOrderDetail(id.toString()),
        enabled: !!id,
        retry: false,
    });
};

export const useCancelMyOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => orderService.cancelOrderUser(id.toString()),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
};

export const useConfirmReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => orderService.confirmReceipt(id.toString()),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
};

// ---- Admin Hooks ----

export const useAdminOrders = (params?: Parameters<typeof adminOrderService.getAll>[0]) => {
    return useQuery({
        queryKey: [...orderKeys.admin(), 'list', params],
        queryFn: () => adminOrderService.getAll(params),
        staleTime: 30 * 1000, // 30 seconds
    });
};

export const useAdminOrderDetail = (id: number) => {
    return useQuery({
        queryKey: [...orderKeys.admin(), 'detail', id],
        queryFn: () => adminOrderService.getDetail(id),
        enabled: !!id,
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof adminOrderService.updateStatus>[1] }) => adminOrderService.updateStatus(id, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...orderKeys.admin(), 'detail', variables.id] });
            queryClient.invalidateQueries({ queryKey: [...orderKeys.admin(), 'list'] });
        },
    });
};
