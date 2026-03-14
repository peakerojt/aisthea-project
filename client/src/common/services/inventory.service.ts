// Removed api import for inventory.service.ts
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

export interface InventoryMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface InventoryPageResponse {
    data: InventoryVariant[];
    meta: InventoryMeta;
}

export interface InventoryProgressSnapshot {
    items: InventoryVariant[];
    loadedPages: number;
    totalPages: number;
    isComplete: boolean;
}

// ─── Inventory Log types ──────────────────────────────────────────────────────

export type InventoryLogReason =
    | 'CHECKOUT'
    | 'PURCHASE_RECEIPT'
    | 'RETURN_RESTORE'
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

export type StockMovementType = 'IMPORT' | 'SALE' | 'RETURN' | 'ADJUST' | 'CANCEL';

export interface StockMovementEntry {
    stockMovementId: number;
    type: StockMovementType | string;
    quantity: number;
    referenceType: string | null;
    referenceId: number | null;
    note: string | null;
    createdAt: string;
    createdBy: string | null;
}

export interface StockMovementsResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    items: StockMovementEntry[];
}

export interface InventorySummaryData {
    totalVariants: number;
    outOfStock: number;
    lowStock: number;
    incomingStock: number;
}

export interface InventorySummaryResponse {
    data: InventorySummaryData;
}

import { inventoryApi } from '@/common/api/inventory.api';

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchInventory = async (
    filters?: InventoryFilters
): Promise<InventoryVariant[]> => {
    const res = await fetchInventoryPage(filters, 1, 200);
    return res.data;
};

const normalizeMeta = (
    meta: unknown,
    page: number,
    pageSize: number,
    count: number,
): InventoryMeta => {
    const raw = (meta ?? {}) as Partial<InventoryMeta>;
    const total = Number(raw.total ?? count);
    const safePage = Number(raw.page ?? page);
    const safePageSize = Number(raw.pageSize ?? pageSize);
    const fallbackTotalPages = Math.max(1, Math.ceil((total || count) / Math.max(1, safePageSize)));
    const totalPages = Number(raw.totalPages ?? fallbackTotalPages);

    return {
        total: Number.isFinite(total) ? total : count,
        page: Number.isFinite(safePage) ? safePage : page,
        pageSize: Number.isFinite(safePageSize) ? safePageSize : pageSize,
        totalPages: Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1,
    };
};

export const fetchInventoryPage = async (
    filters?: InventoryFilters,
    page = 1,
    pageSize = 50,
): Promise<InventoryPageResponse> => {
    const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
    };
    if (filters?.lowStock) params.lowStock = 'true';
    if (filters?.search && filters.search.trim() !== '') params.search = filters.search.trim();

    const res = await inventoryApi.fetch(params);
    return {
        data: res.data,
        meta: normalizeMeta(res.meta, page, pageSize, res.data.length),
    };
};

export const fetchAllInventory = async (
    filters?: InventoryFilters,
): Promise<InventoryVariant[]> => {
    const pageSize = 200;
    const baseParams: Record<string, string> = { pageSize: String(pageSize) };
    if (filters?.lowStock) baseParams.lowStock = 'true';
    if (filters?.search && filters.search.trim() !== '') baseParams.search = filters.search.trim();

    const first = await inventoryApi.fetch({ ...baseParams, page: '1' });
    const firstMeta = first.meta as InventoryMeta | undefined;
    const totalPages = Math.max(1, Number(firstMeta?.totalPages ?? 1));

    if (totalPages <= 1) return first.data;

    const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
            inventoryApi.fetch({ ...baseParams, page: String(idx + 2) }),
        ),
    );

    return [first, ...remaining].flatMap((r) => r.data);
};

export const fetchAllInventoryProgressive = async (
    filters?: InventoryFilters,
    onProgress?: (snapshot: InventoryProgressSnapshot) => void,
): Promise<InventoryVariant[]> => {
    const pageSize = 200;
    const baseParams: Record<string, string> = { pageSize: String(pageSize) };
    if (filters?.lowStock) baseParams.lowStock = 'true';
    if (filters?.search && filters.search.trim() !== '') baseParams.search = filters.search.trim();

    const first = await inventoryApi.fetch({ ...baseParams, page: '1' });
    const firstMeta = first.meta as InventoryMeta | undefined;
    const totalPages = Math.max(1, Number(firstMeta?.totalPages ?? 1));
    let allItems = [...first.data];

    onProgress?.({
        items: allItems,
        loadedPages: 1,
        totalPages,
        isComplete: totalPages === 1,
    });

    if (totalPages <= 1) return allItems;

    for (let page = 2; page <= totalPages; page += 1) {
        const next = await inventoryApi.fetch({ ...baseParams, page: String(page) });
        allItems = [...allItems, ...next.data];

        onProgress?.({
            items: allItems,
            loadedPages: page,
            totalPages,
            isComplete: page === totalPages,
        });
    }

    return allItems;
};

export const bulkUpdateStock = async (
    changes: BulkUpdateChange[]
): Promise<BulkUpdateResponse> => {
    return inventoryApi.bulkUpdate(changes);
};

export const fetchInventoryLogs = async (
    variantId: number,
    page = 1,
    limit = 20
): Promise<InventoryLogsResponse> => {
    return inventoryApi.fetchLogs(variantId, { page: String(page), limit: String(limit) });
};

export const fetchStockMovements = async (
    variantId: number,
    page = 1,
    limit = 20,
): Promise<StockMovementsResponse> => {
    return inventoryApi.fetchMovements(variantId, { page: String(page), limit: String(limit) });
};

export const fetchInventorySummary = async (): Promise<InventorySummaryResponse> => {
    return inventoryApi.fetchSummary();
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
    return inventoryApi.fetchAlerts();
};

