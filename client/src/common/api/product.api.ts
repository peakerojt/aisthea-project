import { api } from '@/common/utils/api';
import {
    Product,
    ProductImage,
    CreateProductPayload,
    CategoryOption,
    BrandOption,
    ProductForEdit,
    UpdateProductPayload,
    SmartDeleteResponse,
    ImportReport
} from '@/common/services/product.service';

export const productApi = {
    fetchProducts: (params: Record<string, string>) => api.get<{ data: Product[] } | Product[]>('/api/products', { params }),

    fetchById: (id: number) => api.get<Product>(`/api/products/${id}`),

    fetchImages: (productId: number) => api.get<ProductImage[]>(`/api/products/${productId}/images`),

    create: (payload: CreateProductPayload) => api.post<{ success: boolean; data: { productId: number; slug: string; variantCount: number } }>('/api/products', payload),

    fetchCategories: () => api.get<CategoryOption[]>('/api/products/meta/categories'),

    fetchBrands: () => api.get<BrandOption[]>('/api/products/meta/brands'),

    fetchForEdit: (id: number) => api.get<ProductForEdit>(`/api/products/${id}/edit`),

    update: (id: number, payload: UpdateProductPayload) => api.put<{ success: boolean; data: { productId: number; variantCount: number } }>(`/api/products/${id}`, payload),

    updateStatus: (id: number, status: 'Active' | 'Inactive' | 'Draft' | 'Archived') =>
        api.patch<{ success: boolean; data: { productId: number; status: string } }>(`/api/products/${id}/status`, { status }),

    delete: (id: number) => api.delete<SmartDeleteResponse>(`/api/products/${id}`),

    downloadTemplate: async () => {
        const res = await fetch('/api/products/export/template', { credentials: 'include' });
        if (!res.ok) throw new Error('Không thể tải template');
        return res.blob();
    },

    exportAll: async () => {
        const res = await fetch('/api/products/export', { credentials: 'include' });
        if (!res.ok) throw new Error('Không thể xuất sản phẩm');
        return res.blob();
    },

    import: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/products/import', {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error ?? 'Lỗi nhập khẩu sản phẩm');
        }
        return data as ImportReport;
    }
};
