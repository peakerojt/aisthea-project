
import { Router } from 'express';
import {
    getAllProducts,
    getProduct,
    createProduct,
    getAllCategories,
    getAllBrands,
    getProductEdit,
    updateProduct,
    deleteProduct,
} from '../controllers/product.controller';
import {
    uploadSingleProductImage,
    uploadMultipleProductImages,
    deleteProductImage,
    getProductImages,
} from '../controllers/productImage.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// ─── Meta (BEFORE /:id) ───────────────────────────────────────────────────────
router.get('/meta/categories', getAllCategories);
router.get('/meta/brands', getAllBrands);

// ─── Product CRUD ─────────────────────────────────────────────────────────────
router.get('/', getAllProducts);
router.post('/', createProduct);

// GET /api/products/:id/edit  (BEFORE /:id to avoid conflict)
router.get('/:id/edit', getProductEdit);

// GET /api/products/:id
router.get('/:id', getProduct);

// PUT /api/products/:id — update
router.put('/:id', updateProduct);

// DELETE /api/products/:id — smart delete
router.delete('/:id', deleteProduct);

// ─── Product Images ───────────────────────────────────────────────────────────
router.get('/:productId/images', getProductImages);
router.post('/:productId/image', upload.single('file'), uploadSingleProductImage);
router.post('/:productId/images', upload.array('files', 20), uploadMultipleProductImages);
router.delete('/images/:imageId', deleteProductImage);

export default router;
