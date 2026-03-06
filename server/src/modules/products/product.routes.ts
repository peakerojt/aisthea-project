import { Router } from 'express';
import { productController } from './product.controller';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
} from './product.validator';
// Legacy controllers — reused to avoid duplication (will be migrated per sprint)
import {
    getAllCategories,
    getAllBrands,
} from '../../controllers/product.controller';
import {
    getProductImages,
    uploadSingleProductImage,
    uploadMultipleProductImages,
    bulkUploadProductImages,
    setPrimaryImage,
    deleteProductImage,
} from '../../controllers/productImage.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// ─── Meta routes — MUST be before /:id ───────────────────────────────────────
// GET /api/products/meta/categories
router.get('/meta/categories', getAllCategories);
// GET /api/products/meta/brands
router.get('/meta/brands', getAllBrands);

// ─── Public Routes ────────────────────────────────────────────────────────────

/** GET /api/products?category=&brand=&search=&page=&limit= */
router.get('/', validate(productQuerySchema, 'query'), productController.getAll);

/** GET /api/products/:id/edit  (admin) — MUST be before /:id */
router.get('/:id/edit', authenticateToken, requirePermission('MANAGE_PRODUCTS'), productController.getForEdit);

// ─── Product Images — MUST be before /:id ────────────────────────────────────
// GET /api/products/:productId/images
router.get('/:productId/images', getProductImages);
// POST /api/products/:productId/image  (single upload)
router.post('/:productId/image', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.single('file'), uploadSingleProductImage);
// POST /api/products/:productId/images  (multi upload)
router.post('/:productId/images', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.array('files', 20), uploadMultipleProductImages);
// POST /api/products/:id/images/bulk
router.post('/:id/images/bulk', authenticateToken, requirePermission('MANAGE_PRODUCTS'), upload.array('files', 20), bulkUploadProductImages);
// PATCH /api/products/:id/images/:imageId/primary
router.patch('/:id/images/:imageId/primary', authenticateToken, requirePermission('MANAGE_PRODUCTS'), setPrimaryImage);
// DELETE /api/products/images/:imageId  — MUST be before /:id
router.delete('/images/:imageId', authenticateToken, requirePermission('MANAGE_PRODUCTS'), deleteProductImage);

/** GET /api/products/:id */
router.get('/:id', productController.getOne);

// ─── Protected Admin Routes ───────────────────────────────────────────────────

/** POST /api/products */
router.post(
    '/',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    validate(createProductSchema),
    productController.create,
);

/** PUT /api/products/:id */
router.put(
    '/:id',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    validate(updateProductSchema),
    productController.update,
);

/** DELETE /api/products/:id */
router.delete(
    '/:id',
    authenticateToken,
    requirePermission('MANAGE_PRODUCTS'),
    productController.delete,
);

export default router;

