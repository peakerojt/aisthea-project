import { productApi } from '@/common/api/product.api';

// â”€â”€â”€ Create Product Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ... existing types remain untouched ...
export interface CreateVariantPayload {
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault?: boolean;
    attributeValues: { attributeName: string; value: string }[];
}

export interface CreateImagePayload {
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
}

export interface CreateProductPayload {
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    categoryId: number;
    brandId?: number;
    status?: string;
    variants: CreateVariantPayload[];
    images: CreateImagePayload[];
}

export interface CategoryOption {
    categoryId: number;
    name: string;
    slug: string;
    parentId?: number | null;
}

export interface BrandOption {
    brandId: number;
    name: string;
}

// Product interfaces based on database schema
export interface ProductImage {
    imageId: number;
    productId: number;
    variantId?: number;
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
}

export interface FlatVariantAttribute {
    attributeName?: string;
    attributeValue?: string;
    value?: string;
    attribute?: {
        name?: string;
    };
}

export interface NestedVariantAttribute {
    attributeValue?: string;
    attribute?: {
        name?: string;
    };
    value?: {
        value?: string;
        attribute?: {
            name?: string;
        };
    };
}

export interface ProductVariant {
    variantId: number;
    productId: number;
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault: boolean;
    images?: ProductImage[];
    variantAttributes?: NestedVariantAttribute[];
    attributes?: FlatVariantAttribute[];
}

export interface Product {
    productId: number;
    categoryId: number;
    brandId?: number;
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    status: string;
    createdAt: string;
    category?: {
        categoryId: number;
        name: string;
        slug: string;
    };
    brand?: {
        brandId: number;
        name: string;
    };
    images?: ProductImage[];
    variants?: ProductVariant[];
    reviews?: Record<string, unknown>[];
}

export interface ProductListMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedProductsResponse {
    data: Product[];
    meta: ProductListMeta;
}

export interface ProductFilters {
    category?: string;
    brand?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
}

const buildProductParams = (filters?: ProductFilters): Record<string, string> => {
    const params: Record<string, string> = {};

    if (filters?.category) params.category = filters.category;
    if (filters?.brand) params.brand = filters.brand.toString();
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice !== undefined) params.minPrice = filters.minPrice.toString();
    if (filters?.maxPrice !== undefined) params.maxPrice = filters.maxPrice.toString();
    if (filters?.status) params.status = filters.status;
    if (filters?.page) params.page = filters.page.toString();
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.sort) params.sort = filters.sort;

    return params;
};

/**
 * Fetch all products with optional filters
 */
export const fetchProducts = async (filters?: ProductFilters): Promise<Product[]> => {
    try {
        const params = buildProductParams({
            status: filters?.status ?? 'Active',
            ...filters,
        });
        const response = await productApi.fetchProducts(params);
        // The backend now returns { data: [...], meta: {...} }
        return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error;
    }
};

/**
 * Fetch products with pagination metadata
 */
export const fetchProductsPage = async (filters?: ProductFilters): Promise<PaginatedProductsResponse> => {
    try {
        const params = buildProductParams(filters);
        const response = await productApi.fetchProducts(params);

        if (Array.isArray(response)) {
            return {
                data: response,
                meta: {
                    total: response.length,
                    page: filters?.page ?? 1,
                    limit: filters?.limit ?? response.length,
                    totalPages: 1,
                },
            };
        }

        return {
            data: response.data || [],
            meta: response.meta || {
                total: response.data?.length || 0,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? (response.data?.length || 0),
                totalPages: 1,
            },
        };
    } catch (error) {
        console.error('Failed to fetch paginated products:', error);
        throw error;
    }
};

/**
 * Fetch a single product by ID
 */
export const fetchProductById = async (id: number): Promise<Product> => {
    try {
        return await productApi.fetchById(id);
    } catch (error) {
        console.error(`Failed to fetch product ${id}:`, error);
        throw error;
    }
};

/**
 * Fetch all images for a product
 */
export const fetchProductImages = async (productId: number): Promise<ProductImage[]> => {
    try {
        return await productApi.fetchImages(productId);
    } catch (error) {
        console.error(`Failed to fetch images for product ${productId}:`, error);
        throw error;
    }
};

/**
 * Get primary image for a product
 */
export const getPrimaryImage = (product: Product): string | null => {
    if (!product.images || product.images.length === 0) {
        return null;
    }

    const primary = product.images.find(img => img.isPrimary);
    return primary?.thumbnailUrl || primary?.imageUrl || product.images[0]?.thumbnailUrl || product.images[0]?.imageUrl || null;
};

/**
 * Get all images for a product variant
 */
export const getVariantImages = (variant: ProductVariant): string[] => {
    if (!variant.images || variant.images.length === 0) {
        return [];
    }

    return variant.images.map(img => img.imageUrl);
};

/**
 * Calculate stock status based on inventory
 */
/**
 * Create a new product with variants and images
 */
export const createProduct = async (payload: CreateProductPayload): Promise<{ productId: number; slug: string; variantCount: number }> => {
    try {
        const result = await productApi.create(payload);
        return result.data;
    } catch (error) {
        console.error('Failed to create product:', error);
        throw error;
    }
};

/**
 * Fetch all categories for the create product form
 */
export const fetchCategories = async (): Promise<CategoryOption[]> => {
    try {
        return await productApi.fetchCategories();
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        throw error;
    }
};

/**
 * Fetch all brands for the create product form
 */
export const fetchBrands = async (): Promise<BrandOption[]> => {
    try {
        return await productApi.fetchBrands();
    } catch (error) {
        console.error('Failed to fetch brands:', error);
        throw error;
    }
};

export const getStockStatus = (stockQuantity: number): 'In Stock' | 'Low Stock' | 'Out of Stock' => {
    if (stockQuantity === 0) return 'Out of Stock';
    if (stockQuantity < 10) return 'Low Stock';
    return 'In Stock';
};

// â”€â”€â”€ Full product data for edit form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ExistingVariant {
    variantId: number;
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault: boolean;
    variantAttributes: {
        value: {
            valueId: number;
            value: string;
            attribute: { attributeId: number; name: string };
        };
    }[];
}

export interface ProductForEdit {
    productId: number;
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    status: string;
    categoryId: number;
    brandId?: number;
    category?: { categoryId: number; name: string; slug: string };
    brand?: { brandId: number; name: string };
    images: {
        imageId: number;
        variantId?: number | null;
        imageUrl: string;
        thumbnailUrl?: string;
        isPrimary: boolean;
    }[];
    variants: ExistingVariant[];
}

export const fetchProductForEdit = async (id: number): Promise<ProductForEdit> => {
    try {
        return await productApi.fetchForEdit(id);
    } catch (error) {
        console.error(`Failed to fetch product ${id} for edit:`, error);
        throw error;
    }
};

export interface UpdateVariantPayload {
    variantId?: number;
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault?: boolean;
    attributeValues: { attributeName: string; value: string }[];
}

export interface UpdateProductPayload {
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    categoryId: number;
    brandId?: number;
    status?: string;
    deletedImageIds: number[];
    newImages: { imageUrl: string; thumbnailUrl?: string; isPrimary?: boolean; associatedAttributeValue?: string }[];
    updatedImages?: { imageId: number; associatedAttributeValue?: string; isPrimary?: boolean }[];
    primaryImageId?: number;
    variants: UpdateVariantPayload[];
    keptVariantIds: number[];
}

export interface ProductStatusUpdateResponse {
    productId: number;
    status: string;
}

export const updateProduct = async (
    id: number,
    payload: UpdateProductPayload
): Promise<{ productId: number; variantCount: number }> => {
    try {
        const result = await productApi.update(id, payload);
        return result.data;
    } catch (error) {
        console.error(`Failed to update product ${id}:`, error);
        throw error;
    }
};

export const updateProductStatus = async (
    id: number,
    status: 'Active' | 'Inactive' | 'Draft' | 'Archived'
): Promise<ProductStatusUpdateResponse> => {
    try {
        const result = await productApi.updateStatus(id, status);
        return result.data;
    } catch (error) {
        console.error(`Failed to update product status ${id}:`, error);
        throw error;
    }
};

// â”€â”€â”€ Smart Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SmartDeleteResponse {
    success: boolean;
    mode: 'archived' | 'deleted';
    message: string;
}

export const deleteProductById = async (id: number): Promise<SmartDeleteResponse> => {
    try {
        return await productApi.delete(id);
    } catch (error) {
        console.error(`Failed to delete product ${id}:`, error);
        throw error;
    }
};

// â”€â”€â”€ Bulk Import / Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ImportError {
    row: number;
    handle: string;
    reason: string;
}

export interface ImportReport {
    total: number;
    success: number;
    failed: number;
    errors: ImportError[];
}

/** Triggers browser download of an empty Excel template */
export const downloadTemplate = async (): Promise<void> => {
    const blob = await productApi.downloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_san_pham.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

/** Triggers browser download of all products as Excel */
export const exportAllProducts = async (): Promise<void> => {
    const blob = await productApi.exportAll();
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `san_pham_${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

/** Upload an xlsx/csv file for import. Returns detailed report. */
export const importProducts = async (file: File): Promise<ImportReport> => {
    return await productApi.import(file);
};



