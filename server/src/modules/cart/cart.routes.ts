import { Router } from 'express';
import { cartController } from './cart.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
    addToCartSchema,
    cartItemIdParamSchema,
    mergeCartSchema,
    updateCartItemSchema,
} from './cart.validator';

const router = Router();

// All cart routes require authentication
router.get('/', authenticateToken, (req, res) => cartController.getCart(req as any, res));
router.post('/add', authenticateToken, validate(addToCartSchema), (req, res) => cartController.addToCart(req as any, res));
router.put('/update', authenticateToken, validate(updateCartItemSchema), (req, res) => cartController.updateCartItem(req as any, res));
router.delete('/item/:cartItemId', authenticateToken, validate(cartItemIdParamSchema, 'params'), (req, res) => cartController.removeCartItem(req as any, res));
router.delete('/clear', authenticateToken, (req, res) => cartController.clearCart(req as any, res));
router.post('/merge', authenticateToken, validate(mergeCartSchema), (req, res) => cartController.mergeCart(req as any, res));

export default router;
