
import { Router } from 'express';
import { getAllProducts, getProduct } from '../controllers/product.controller';
import {
    uploadSingleProductImage,
    uploadMultipleProductImages,
    deleteProductImage,
    getProductImages,
} from '../controllers/productImage.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// GET /api/products
router.get('/', getAllProducts);

// GET /api/products/:id
router.get('/:id', getProduct);

// ============ PRODUCT IMAGES ============

// GET /api/products/:productId/images - Get all images for a product
router.get('/:productId/images', getProductImages);

// POST /api/products/:productId/image - Upload single image
router.post('/:productId/image', upload.single('file'), uploadSingleProductImage);

// POST /api/products/:productId/images - Batch upload images
router.post('/:productId/images', upload.array('files', 20), uploadMultipleProductImages);

// DELETE /api/products/images/:imageId - Delete image
router.delete('/images/:imageId', deleteProductImage);

export default router;
