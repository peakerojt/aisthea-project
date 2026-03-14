import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// ─── Tất cả route giỏ hàng đều yêu cầu đăng nhập ───────────────────────────
router.get('/', authenticateToken, (req, res) => cartController.getCart(req as any, res));
router.post('/add', authenticateToken, (req, res) => cartController.addToCart(req as any, res));
router.put('/update', authenticateToken, (req, res) => cartController.updateCartItem(req as any, res));
router.delete('/item/:cartItemId', authenticateToken, (req, res) => cartController.removeCartItem(req as any, res));
router.delete('/clear', authenticateToken, (req, res) => cartController.clearCart(req as any, res));
router.post('/merge', authenticateToken, (req, res) => cartController.mergeCart(req as any, res));

export default router;
