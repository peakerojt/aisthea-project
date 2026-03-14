import { api } from '@/common/utils/api';
import { CategoryNode, CategoryFlat, CreateCategoryPayload, UpdateCategoryPayload } from '@/common/services/category.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const categoryApi = {
    fetchTree: () => api.get<{ success: boolean; data: CategoryNode[] }>('/api/categories/tree'),
    fetchFlat: () => api.get<{ success: boolean; data: CategoryFlat[] }>('/api/categories/flat'),
    create: (payload: CreateCategoryPayload) => api.post<{ success: boolean; message: string; data: unknown }>('/api/categories', payload),
    update: (id: number, payload: UpdateCategoryPayload) => api.put<{ success: boolean; message: string; data: unknown }>(`/api/categories/${id}`, payload),
    remove: (id: number) => api.delete<{ success: boolean; message: string }>(`/api/categories/${id}`),
    uploadImage: async (file: File) => {
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
        return response.json() as Promise<{ imageUrl: string }>;
    }
};
