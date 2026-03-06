
import { Request, Response } from 'express';
import {
    getProducts,
    getProductById,
    createProduct as createProductService,
    getCategories,
    getBrands,
    getProductForEdit as getProductForEditService,
    updateProduct as updateProductService,
    smartDeleteProduct as smartDeleteProductService,
} from '../services/product.service';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { category, brand, search, minPrice, maxPrice, page, limit, sort } = req.query;

        const filters = {
            categorySlug: category as string,
            brandId: brand ? Number(brand) : undefined,
            search: search as string,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sort: sort as string,
        };

        const products = await getProducts(filters); // Resolves to { data, meta }
        res.json(products);
    } catch (error: any) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const product = await getProductById(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error: any) {
        console.error('Get product by ID error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

/**
 * POST /api/products
 * Create a new product with variants, attributes, and images (all in a transaction)
 */
export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            name, slug, description, basePrice, categoryId, brandId,
            status, variants, images,
        } = req.body;

        // Basic validation
        if (!name || !slug || basePrice === undefined || !categoryId) {
            return res.status(400).json({
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'Missing required fields: name, slug, price, category.',
            });
        }

        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ error: 'VARIANTS_REQUIRED', message: 'Product must have at least one variant.' });
        }

        const result = await createProductService({
            name,
            slug,
            description,
            basePrice: Number(basePrice),
            categoryId: Number(categoryId),
            brandId: brandId ? Number(brandId) : undefined,
            status,
            variants,
            images: images || [],
        });

        res.status(201).json({
            success: true,
            code: 'PRODUCT_CREATED',
            message: 'Product created successfully.',
            data: result,
        });
    } catch (error: any) {
        console.error('Create product error:', error);
        // Slug uniqueness violation
        if (error.message?.includes('Unique constraint') || error.code === 'P2002') {
            return res.status(409).json({ error: 'SLUG_ALREADY_EXISTS', message: 'Product slug already exists. Please use a different name.' });
        }
        res.status(500).json({
            error: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Server error. Please try again.',
        });
    }
};

/**
 * GET /api/products/meta/categories
 */
export const getAllCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await getCategories();
        res.json(categories);
    } catch (error: any) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * GET /api/products/meta/brands
 */
export const getAllBrands = async (_req: Request, res: Response) => {
    try {
        const brands = await getBrands();
        res.json(brands);
    } catch (error: any) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * GET /api/products/:id/edit
 * Returns full nested product data for the Edit form
 */
export const getProductEdit = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'INVALID_PRODUCT_ID', message: 'Invalid product ID.' });

        const product = await getProductForEditService(id);
        if (!product) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });

        res.json(product);
    } catch (error: any) {
        console.error('Get product for edit error:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error.' });
    }
};

/**
 * PUT /api/products/:id
 * Update a product atomically
 */
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'INVALID_PRODUCT_ID', message: 'Invalid product ID.' });

        const {
            name, slug, description, basePrice, categoryId, brandId, status,
            deletedImageIds = [], newImages = [], primaryImageId,
            variants = [], keptVariantIds = [],
        } = req.body;

        if (!name || !slug || basePrice === undefined || !categoryId) {
            return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS', message: 'Missing required fields: name, slug, price, category.' });
        }

        const result = await updateProductService(id, {
            name, slug, description,
            basePrice: Number(basePrice),
            categoryId: Number(categoryId),
            brandId: brandId ? Number(brandId) : undefined,
            status,
            deletedImageIds: deletedImageIds.map(Number),
            newImages,
            primaryImageId: primaryImageId !== undefined ? Number(primaryImageId) : undefined,
            variants,
            keptVariantIds: keptVariantIds.map(Number),
        });

        res.json({ success: true, code: 'PRODUCT_UPDATED', message: 'Product updated successfully.', data: result });
    } catch (error: any) {
        console.error('Update product error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'SLUG_OR_SKU_EXISTS', message: 'Slug or SKU already exists. Please use a different name.' });
        }
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error. Please try again.' });
    }
};

/**
 * DELETE /api/products/:id — Smart Delete
 * Archive if has orders, hard-delete if not
 */
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'INVALID_PRODUCT_ID', message: 'Invalid product ID.' });

        const result = await smartDeleteProductService(id);

        res.json({
            success: true,
            mode: result.mode,
            message: result.message,
        });
    } catch (error: any) {
        console.error('Smart delete product error:', error);
        if (error.message?.includes('Không tìm thấy') || error.message?.includes('not found')) {
            return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
        }
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Server error. Please try again.' });
    }
};


