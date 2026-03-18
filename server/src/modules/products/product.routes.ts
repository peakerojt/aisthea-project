import { Router, Request, Response, NextFunction } from 'express';
import { productController } from './product.controller';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { cacheMiddleware, invalidateCache, CACHE_TTL } from '../../middlewares/cache.middleware';
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
} from './product.validator';
import { productMediaController } from './product-media.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// ─── Meta routes — MUST be before /:id ───────────────────────────────────────
// GET /api/products/meta/categories
router.get('/meta/categories', cacheMiddleware(CACHE_TTL.CATEGORIES), productController.getCategories);
// GET /api/products/meta/brands
router.get('/meta/brands', cacheMiddleware(CACHE_TTL.BRANDS), productController.getBrands);

// ─── Public Routes ────────────────────────────────────────────────────────────

/** GET /api/products?category=&brand=&search=&page=&limit= */
router.get('/', cacheMiddleware(CACHE_TTL.PRODUCTS), validate(productQuerySchema, 'query'), productController.getAll);

/** GET /api/products/:id/edit  (admin) — MUST be before /:id */
router.get('/:id/edit', authenticateToken, requirePermission('MANAGE_PRODUCTS'), productController.getForEdit);

// ─── Product Images — MUST be before /:id ────────────────────────────────────
// GET /api/products/:productId/images
router.get('/:productId/images', productMediaController.getProductImages);
// POST /api/products/:productId/image  (single upload)
router.post('/:productId/image', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.single('file'), productMediaController.uploadSingleProductImage);
// POST /api/products/:productId/images  (multi upload)
router.post('/:productId/images', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.array('files', 20), productMediaController.uploadMultipleProductImages);
// POST /api/products/:id/images/bulk
router.post('/:id/images/bulk', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.array('files', 20), productMediaController.bulkUploadProductImages);
// PATCH /api/products/:id/images/:imageId/primary
router.patch('/:id/images/:imageId/primary', authenticateToken, requirePermission('MANAGE_PRODUCTS'), productMediaController.setPrimaryImage);
// DELETE /api/products/images/:imageId  — MUST be before /:id
router.delete('/images/:imageId', authenticateToken, requirePermission('MANAGE_PRODUCTS'), productMediaController.deleteProductImage);

/** GET /api/products/:id */
router.get('/:id', productController.getOne);

// ─── Protected Admin Routes ───────────────────────────────────────────────────

/** POST /api/products */
const invalidateProductCache = (_req: Request, _res: Response, next: NextFunction) => {
    invalidateCache('/api/products');
    next();
};
router.post(
    '/',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    invalidateProductCache,
    validate(createProductSchema),
    productController.create,
);

/** PUT /api/products/:id */
router.put(
    '/:id',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    invalidateProductCache,
    validate(updateProductSchema),
    productController.update,
);

/** PATCH /api/products/:id/status */
router.patch(
    '/:id/status',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    invalidateProductCache,
    productController.updateStatus,
);

/** DELETE /api/products/:id */
router.delete(
    '/:id',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    invalidateProductCache,
    productController.delete,
);

export default router;

