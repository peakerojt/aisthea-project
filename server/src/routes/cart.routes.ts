import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, cartController.getCart);
router.post('/add', authenticateToken, cartController.addToCart);
router.put('/update', authenticateToken, cartController.updateCartItem);
router.delete('/remove', authenticateToken, cartController.removeCartItem);

export default router;
