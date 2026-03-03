import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class CartController {
    async getCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const cart = await cartService.getCartByUserId(userId);
            res.json(cart);
        } catch (error) {
            console.error('Get cart error:', error);
            res.status(500).json({ message: 'Error fetching cart' });
        }
    }

    async addToCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const { variantId, quantity } = req.body;

            if (!variantId || !quantity) {
                return res.status(400).json({ message: 'Missing variantId or quantity' });
            }

            await cartService.addToCart(userId, variantId, quantity);
            res.json({ message: 'Item added to cart successfully' });
        } catch (error) {
            console.error('Add to cart error:', error);
            res.status(500).json({ message: 'Error adding item to cart' });
        }
    }

    async updateCartItem(req: AuthRequest, res: Response) {
        try {
            const { cartItemId, quantity } = req.body;

            if (!cartItemId || quantity === undefined) {
                return res.status(400).json({ message: 'Missing cartItemId or quantity' });
            }

            await cartService.updateCartItem(cartItemId, quantity);
            res.json({ message: 'Cart item updated successfully' });
        } catch (error) {
            console.error('Update cart item error:', error);
            res.status(500).json({ message: 'Error updating cart item' });
        }
    }

    async removeCartItem(req: AuthRequest, res: Response) {
        try {
            const { cartItemId } = req.body;

            if (!cartItemId) {
                return res.status(400).json({ message: 'Missing cartItemId' });
            }

            await cartService.removeCartItem(cartItemId);
            res.json({ message: 'Item removed from cart successfully' });
        } catch (error) {
            console.error('Remove cart item error:', error);
            res.status(500).json({ message: 'Error removing item from cart' });
        }
    }
}

export const cartController = new CartController();
