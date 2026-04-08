import i18n from '@/i18n/config';
import { API_BASE_URL, api } from '@/common/utils/api';
import {
    type ImportReport,
    Product,
    ProductImage,
    CreateProductPayload,
    CategoryOption,
    BrandOption,
    ProductForEdit,
    SizeGuideTemplateOption,
    UpdateProductPayload,
    SmartDeleteResponse,
} from '@/common/services/product.service';

type ProductApiErrorPayload = {
    code?: string;
    errorCode?: string;
    error?: string;
    message?: string;
    messageKey?: string;
};

const DEFAULT_LANGUAGE = 'vi';

const getActiveLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
    return current.split('-')[0] || DEFAULT_LANGUAGE;
};

const resolveProductApiMessage = (payload: ProductApiErrorPayload | null, fallback: string) => {
    if (payload?.messageKey) {
        return i18n.t(payload.messageKey, { defaultValue: payload.message || fallback });
    }

    const code = payload?.errorCode || payload?.code || payload?.error;
    if (code) {
        return i18n.t(`errors:${code}`, { defaultValue: payload?.message || code });
    }

    return payload?.message || fallback;
};

const createProductApiError = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => null) as ProductApiErrorPayload | null;
    const message = resolveProductApiMessage(payload, fallback);
    const error = new Error(message) as Error & { status: number; code?: string; messageKey?: string };
    error.status = response.status;
    error.code = payload?.code || payload?.errorCode || payload?.error;
    error.messageKey = payload?.messageKey;
    throw error;
};

const fetchProductBlob = async (endpoint: string, fallback: string) => {
    const language = getActiveLanguage();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
        headers: {
            'x-lang': language,
            'accept-language': language,
        },
    });

    if (!response.ok) {
        await createProductApiError(response, fallback);
    }

    return response.blob();
};

export const productApi = {
    fetchProducts: (params: Record<string, string>) => api.get<{ data: Product[] } | Product[]>('/api/products', { params }),

    fetchById: (id: number) => api.get<Product>(`/api/products/${id}`),

    fetchImages: (productId: number) => api.get<ProductImage[]>(`/api/products/${productId}/images`),

    create: (payload: CreateProductPayload) => api.post<{ success: boolean; data: { productId: number; slug: string; variantCount: number } }>('/api/products', payload),

    fetchCategories: () => api.get<CategoryOption[]>('/api/products/meta/categories'),

    fetchBrands: () => api.get<BrandOption[]>('/api/products/meta/brands'),

    fetchSizeGuideTemplates: () => api.get<SizeGuideTemplateOption[]>('/api/products/meta/size-guides'),

    fetchForEdit: (id: number) => api.get<ProductForEdit>(`/api/products/${id}/edit`),

    update: (id: number, payload: UpdateProductPayload) => api.put<{ success: boolean; data: { productId: number; variantCount: number } }>(`/api/products/${id}`, payload),

    updateStatus: (id: number, status: 'Active' | 'Inactive' | 'Draft' | 'Archived') =>
        api.patch<{ success: boolean; data: { productId: number; status: string } }>(`/api/products/${id}/status`, { status }),

    delete: (id: number) => api.delete<SmartDeleteResponse>(`/api/products/${id}`),

    downloadTemplate: async () => fetchProductBlob('/api/products/export/template', 'Không thể tải template'),

    exportAll: async () => fetchProductBlob('/api/products/export', 'Không thể xuất sản phẩm'),

    import: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<ImportReport>('/api/products/import', formData);
    }
};
