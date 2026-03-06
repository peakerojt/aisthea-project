import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { ProductFilter } from './product.repository';
import type { ProductQueryDto } from './product.validator';

/**
 * Thin controller — parses request, delegates to service, returns standard envelope.
 * No business logic, no Prisma imports.
 */
export const productController = {
    // GET /api/products
    getAll: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const q = req.query;
            const filters: ProductFilter = {
                categorySlug: q.category as string | undefined,
                brandId: q.brand ? Number(q.brand) : undefined,
                search: q.search as string | undefined,
                minPrice: q.minPrice ? Number(q.minPrice) : undefined,
                maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
                status: (q.status as string | undefined) ?? 'Active',
                page: q.page ? Number(q.page) : 1,
                limit: q.limit ? Math.min(Number(q.limit), 100) : 20,
            };
            const result = await productService.getProducts(filters);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    // GET /api/products/:id
    getOne: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid product ID.' });
            }
            // Return product directly — client's fetchProductById expects the product object
            const product = await productService.getProductById(id);
            res.json(product);
        } catch (err) {
            next(err);
        }
    },

    // GET /api/products/:id/edit
    getForEdit: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid product ID.' });
            }
            // fetchProductForEdit on client expects the product object directly
            const product = await productService.getProductForEdit(id);
            res.json(product);
        } catch (err) {
            next(err);
        }
    },

    // POST /api/products
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await productService.createProduct(req.body);
            res.status(201).json({ success: true, data: result, message: 'Product created successfully.' });
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/products/:id
    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid product ID.' });
            }
            const result = await productService.updateProduct(id, req.body);
            res.json({ success: true, data: result, message: 'Product updated successfully.' });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/products/:id
    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid product ID.' });
            }
            const result = await productService.deleteProduct(id);
            res.json({ success: true, data: result, message: result.message });
        } catch (err) {
            next(err);
        }
    },
};
