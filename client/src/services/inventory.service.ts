import { api } from '../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryVariant {
    variantId: number;
    productId: number;
    sku: string;
    price: number;
    stockQuantity: number;
    variantLabel: string; // e.g. "Đỏ/L"
    product: {
        name: string;
        primaryImageUrl: string | null;
    };
}

export interface BulkUpdateChange {
    variantId: number;
    quantity: number;
}

export interface BulkUpdateResponse {
    success: boolean;
    message: string;
    updatedCount: number;
}

export interface InventoryFilters {
    lowStock?: boolean;
    search?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchInventory = async (
    filters?: InventoryFilters
): Promise<InventoryVariant[]> => {
    const params: Record<string, string> = {};
    if (filters?.lowStock) params.lowStock = 'true';
    if (filters?.search && filters.search.trim() !== '') params.search = filters.search.trim();
    return api.get<InventoryVariant[]>('/api/inventory', { params });
};

export const bulkUpdateStock = async (
    changes: BulkUpdateChange[]
): Promise<BulkUpdateResponse> => {
    return api.patch<BulkUpdateResponse>('/api/inventory/update', changes);
};

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────

export interface LowStockAlertItem {
    variantId: number;
    productId: number;
    sku: string;
    stockQuantity: number;
    variantLabel: string;
    product: {
        name: string;
        primaryImageUrl: string | null;
    };
}

export interface LowStockAlertsResponse {
    totalLowStock: number;
    items: LowStockAlertItem[];
}

export const fetchLowStockAlerts = async (): Promise<LowStockAlertsResponse> => {
    return api.get<LowStockAlertsResponse>('/api/inventory/alerts');
};
