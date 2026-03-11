import { itemsApi } from '@/common/api/items.api';

export interface Item {
    id: number;
    title: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

/** Fetch all items sorted by sortOrder ASC */
export async function fetchItems(): Promise<Item[]> {
    const response = await itemsApi.fetchItems();
    return response.data;
}

/** Reorder: move itemId from fromIndex to toIndex */
export async function reorderItems(params: {
    itemId: number;
    fromIndex: number;
    toIndex: number;
}): Promise<Item[]> {
    const response = await itemsApi.reorderItems(params);
    return response.data;
}
