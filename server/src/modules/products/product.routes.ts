import { Router } from 'express';
import { productController } from './product.controller';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
} from './product.validator';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/** GET /api/products?category=&brand=&search=&page=&limit= */
router.get('/', validate(productQuerySchema, 'query'), productController.getAll);

/** GET /api/products/:id */
router.get('/:id', productController.getOne);

/** GET /api/products/:id/edit  (admin) */
router.get('/:id/edit', authenticateToken, requirePermission('MANAGE_PRODUCTS'), productController.getForEdit);

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
