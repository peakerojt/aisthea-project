import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export interface Item {
    id: number;
    title: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
}

const http = axios.create({ baseURL: `${BASE}/api/items`, withCredentials: true });

/** Fetch all items sorted by sortOrder ASC */
export async function fetchItems(): Promise<Item[]> {
    const { data } = await http.get<ApiResponse<Item[]>>('/');
    return data.data;
}

/** Reorder: move itemId from fromIndex to toIndex */
export async function reorderItems(params: {
    itemId: number;
    fromIndex: number;
    toIndex: number;
}): Promise<Item[]> {
    const { data } = await http.patch<ApiResponse<Item[]>>('/reorder', params);
    return data.data;
}
