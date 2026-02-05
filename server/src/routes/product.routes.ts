
import { Router } from 'express';
import { getAllProducts, getProduct } from '../controllers/product.controller';

const router = Router();

// GET /api/products
router.get('/', getAllProducts);

// GET /api/products/:id
router.get('/:id', getProduct);

export default router;
