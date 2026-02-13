
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getProducts = async (filters?: {
    categorySlug?: string;
    brandId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}) => {
    // Use optimized view instead of complex joins
    // Build WHERE clause dynamically
    const conditions: string[] = ['1=1']; // Always true base condition
    const params: any[] = [];

    if (filters?.categorySlug) {
        conditions.push('categorySlug = @P' + (params.length + 1));
        params.push(filters.categorySlug);
    }

    if (filters?.brandId) {
        conditions.push('brandName IS NOT NULL'); // Could enhance by adding BrandId to view
    }

    if (filters?.search) {
        conditions.push('(name LIKE @P' + (params.length + 1) + ' OR description LIKE @P' + (params.length + 1) + ')');
        params.push(`%${filters.search}%`);
    }

    if (filters?.minPrice) {
        conditions.push('minPrice >= @P' + (params.length + 1));
        params.push(filters.minPrice);
    }

    if (filters?.maxPrice) {
        conditions.push('maxPrice <= @P' + (params.length + 1));
        params.push(filters.maxPrice);
    }

    const whereClause = conditions.join(' AND ');

    // Use unsafe raw query since Prisma.sql doesn't support dynamic WHERE well
    // Alternatively use queryRaw with proper parametrization
    const query = `SELECT * FROM vw_ProductCatalog WHERE ${whereClause} ORDER BY createdAt DESC`;

    const products: any[] = await prisma.$queryRawUnsafe(query, ...params);

    // Transform data to match frontend expectations
    return products.map(p => ({
        productId: p.productId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        status: p.status,
        createdAt: p.createdAt,
        // Transform view fields to Prisma-like nested structure
        category: p.categoryName ? {
            name: p.categoryName,
            slug: p.categorySlug
        } : null,
        brand: p.brandName ? {
            name: p.brandName
        } : null,
        images: p.primaryImageUrl ? [{
            imageUrl: p.primaryImageUrl,
            thumbnailUrl: p.primaryThumbnailUrl,
            isPrimary: true
        }] : [],
        // Variants info from aggregation
        variants: [{
            price: p.minPrice || p.basePrice,
            stockQuantity: p.totalStock || 0
        }]
    }));
};

export const searchProducts = async (searchTerm: string, maxResults: number = 50) => {
    // Call sp_SearchProducts for intelligent Vietnamese-aware search
    const results: any[] = await prisma.$queryRaw`EXEC sp_SearchProducts @SearchTerm = ${searchTerm}, @MaxResults = ${maxResults}`;

    return results;
};

export const getProductById = async (id: number) => {
    // Call Stored Procedure
    // Note: SQL Server FOR JSON output is usually split across multiple rows if very large, 
    // but for typical product details it fits in one.
    // However, Prisma raw query with SQL Server returns an array of objects. 
    // If we use FOR JSON without array wrapper, we get a single object with a long JSON string.
    // The column name is usually weird, so we should rely on Object.values().

    try {
        const result: any[] = await prisma.$queryRaw`EXEC sp_GetProductDetails @ProductId = ${id}`;

        if (!result || result.length === 0) {
            return null;
        }

        // Concatenate JSON chunks if multiple rows returned (rare but possible with FOR JSON)
        let jsonString = '';
        result.forEach(row => {
            const val = Object.values(row)[0];
            if (val) jsonString += val;
        });

        if (!jsonString) return null;

        const product = JSON.parse(jsonString);
        return product;
    } catch (error) {
        console.error('Error calling sp_GetProductDetails:', error);
        throw error;
    }
};
