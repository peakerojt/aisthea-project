import { api } from '../utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CategoryNode {
    categoryId: number;
    parentId: number | null;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    _count: { products: number };
    children: CategoryNode[];
}

export interface CategoryFlat {
    categoryId: number;
    parentId: number | null;
    name: string;
    slug: string;
}

export interface CreateCategoryPayload {
    name: string;
    parentId?: number | null;
    description?: string;
    imageUrl?: string;
}

export interface UpdateCategoryPayload extends CreateCategoryPayload {
    // same fields as create
}

// ─── API Calls ───────────────────────────────────────────────────────────────

export const fetchCategoryTree = async (): Promise<CategoryNode[]> => {
    const res = await api.get<{ success: boolean; data: CategoryNode[] }>('/api/categories/tree');
    return (res as { data?: CategoryNode[] }).data ?? res as unknown as CategoryNode[];
};

export const fetchCategoryFlat = async (): Promise<CategoryFlat[]> => {
    const res = await api.get<{ success: boolean; data: CategoryFlat[] }>('/api/categories/flat');
    return (res as { data?: CategoryFlat[] }).data ?? res as unknown as CategoryFlat[];
};

export const createCategory = async (
    payload: CreateCategoryPayload
): Promise<{ success: boolean; message: string; data: unknown }> => {
    return api.post('/api/categories', payload);
};

export const updateCategory = async (
    id: number,
    payload: UpdateCategoryPayload
): Promise<{ success: boolean; message: string; data: unknown }> => {
    return api.put(`/api/categories/${id}`, payload);
};

export const deleteCategory = async (
    id: number
): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/api/categories/${id}`);
};

/**
 * Upload a category image via FormData (multipart)
 * Returns the Cloudinary imageUrl
 */
export const uploadCategoryImage = async (file: File): Promise<string> => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/categories/upload-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Upload ảnh thất bại');
    }

    const result = await response.json();
    return result.imageUrl;
};

// ─── Helper: Build indented flat list for Combobox ───────────────────────────

export interface IndentedOption {
    value: number;
    label: string;
    depth: number;
}

export function buildIndentedOptions(flat: CategoryFlat[]): IndentedOption[] {
    // Build parentMap
    const childMap = new Map<number | null, CategoryFlat[]>();
    for (const cat of flat) {
        const key = cat.parentId;
        if (!childMap.has(key)) childMap.set(key, []);
        childMap.get(key)!.push(cat);
    }

    const result: IndentedOption[] = [];

    function walk(parentId: number | null, depth: number) {
        const children = childMap.get(parentId) ?? [];
        for (const cat of children) {
            result.push({ value: cat.categoryId, label: cat.name, depth });
            walk(cat.categoryId, depth + 1);
        }
    }

    walk(null, 0);
    return result;
}
