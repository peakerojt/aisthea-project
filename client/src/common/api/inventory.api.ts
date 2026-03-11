import { api } from '@/common/utils/api';
import { InventoryVariant, BulkUpdateChange, BulkUpdateResponse, InventoryLogsResponse, LowStockAlertsResponse } from '@/common/services/inventory.service';

export const inventoryApi = {
    fetch: (params: Record<string, string>) => api.get<{ data: InventoryVariant[], meta: unknown }>('/api/inventory', { params }),

    bulkUpdate: (changes: BulkUpdateChange[]) => api.patch<BulkUpdateResponse>('/api/inventory/update', changes),

    fetchLogs: (variantId: number, params: { page: string; limit: string }) => api.get<InventoryLogsResponse>(`/api/inventory/${variantId}/logs`, { params }),

    fetchAlerts: () => api.get<LowStockAlertsResponse>('/api/inventory/alerts')
};
