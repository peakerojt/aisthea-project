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
    reason?: string; // Optional — defaults to 'MANUAL_ADJUST' on the server
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

// ─── Inventory Log types ──────────────────────────────────────────────────────

export type InventoryLogReason =
    | 'CHECKOUT'
    | 'RESTOCK'
    | 'CANCELLED_RESTORE'
    | 'MANUAL_ADJUST';

export interface InventoryLogEntry {
    logId: number;
    changeQuantity: number;
    previousStock: number;
    newStock: number;
    reason: InventoryLogReason | string;
    note: string | null;
    createdAt: string; // ISO date string
    orderNumber: string | null;
    changedBy: string | null;
}

export interface InventoryLogsResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    items: InventoryLogEntry[];
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchInventory = async (
    filters?: InventoryFilters
): Promise<InventoryVariant[]> => {
    const params: Record<string, string> = {
        pageSize: '200' // Request maximum allowed by backend
    };
    if (filters?.lowStock) params.lowStock = 'true';
    if (filters?.search && filters.search.trim() !== '') params.search = filters.search.trim();

    // Backend getInventory now returns { data, meta } due to BE-3
    const res = await api.get<{ data: InventoryVariant[], meta: unknown }>('/api/inventory', { params });
    return res.data;
};

export const bulkUpdateStock = async (
    changes: BulkUpdateChange[]
): Promise<BulkUpdateResponse> => {
    return api.patch<BulkUpdateResponse>('/api/inventory/update', changes);
};

export const fetchInventoryLogs = async (
    variantId: number,
    page = 1,
    limit = 20
): Promise<InventoryLogsResponse> => {
    return api.get<InventoryLogsResponse>(`/api/inventory/${variantId}/logs`, {
        params: { page: String(page), limit: String(limit) },
    });
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

