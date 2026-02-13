import { api } from '../utils/api';

// Product interfaces based on database schema
export interface ProductImage {
    imageId: number;
    productId: number;
    variantId?: number;
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
}

export interface ProductVariant {
    variantId: number;
    productId: number;
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault: boolean;
    images?: ProductImage[];
    variantAttributes?: any[];
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
    reviews?: any[];
}

export interface ProductFilters {
    category?: string;
    brand?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}

/**
 * Fetch all products with optional filters
 */
export const fetchProducts = async (filters?: ProductFilters): Promise<Product[]> => {
    try {
        const params: Record<string, string> = {};

        if (filters?.category) params.category = filters.category;
        if (filters?.brand) params.brand = filters.brand.toString();
        if (filters?.search) params.search = filters.search;
        if (filters?.minPrice) params.minPrice = filters.minPrice.toString();
        if (filters?.maxPrice) params.maxPrice = filters.maxPrice.toString();

        const products = await api.get<Product[]>('/api/products', { params });
        return products;
    } catch (error) {
        console.error('Failed to fetch products:', error);
        throw error;
    }
};

/**
 * Fetch a single product by ID
 */
export const fetchProductById = async (id: number): Promise<Product> => {
    try {
        const product = await api.get<Product>(`/api/products/${id}`);
        return product;
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
        const images = await api.get<ProductImage[]>(`/api/products/${productId}/images`);
        return images;
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
export const getStockStatus = (stockQuantity: number): 'In Stock' | 'Low Stock' | 'Out of Stock' => {
    if (stockQuantity === 0) return 'Out of Stock';
    if (stockQuantity < 10) return 'Low Stock';
    return 'In Stock';
};
