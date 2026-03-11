import { api } from '@/common/utils/api';
import { Item } from '@/common/services/items.service';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
}

export const itemsApi = {
    fetchItems: () => api.get<ApiResponse<Item[]>>('/api/items/'),
    reorderItems: (params: { itemId: number; fromIndex: number; toIndex: number }) => api.patch<ApiResponse<Item[]>>('/api/items/reorder', params)
};
