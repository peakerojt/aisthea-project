import { Response } from 'express';
import { cartService } from '../services/cart.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class CartController {
    // GET /api/cart — Lấy giỏ hàng của user
    async getCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const cart = await cartService.getCart(userId);
            res.json({ success: true, data: cart });
        } catch (error: any) {
            console.error('[Cart] Lỗi khi lấy giỏ hàng:', error);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi lấy giỏ hàng.' });
        }
    }

    // POST /api/cart/add — Thêm sản phẩm vào giỏ
    async addToCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const { variantId, quantity } = req.body;

            if (!variantId || !quantity || quantity <= 0) {
                return res.status(400).json({ success: false, code: 'INVALID_BODY', message: 'Thiếu variantId hoặc số lượng không hợp lệ.' });
            }

            const cart = await cartService.upsertCartItem(userId, Number(variantId), Number(quantity));
            res.json({ success: true, code: 'CART_ITEM_ADDED', data: cart });
        } catch (error: any) {
            if (error?.code === 'INSUFFICIENT_STOCK') {
                return res.status(409).json({ success: false, code: error.code, available: error.available, message: error.message });
            }
            if (error?.code === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({ success: false, code: error.code, message: error.message });
            }
            console.error('[Cart] Lỗi thêm vào giỏ:', error);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi thêm sản phẩm vào giỏ hàng.' });
        }
    }

    // PUT /api/cart/update — Cập nhật số lượng sản phẩm
    async updateCartItem(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const { cartItemId, quantity } = req.body;

            if (!cartItemId || quantity === undefined || quantity === null) {
                return res.status(400).json({ success: false, code: 'INVALID_BODY', message: 'Thiếu cartItemId hoặc số lượng.' });
            }

            const cart = await cartService.updateCartItemQuantity(userId, Number(cartItemId), Number(quantity));
            res.json({ success: true, data: cart });
        } catch (error: any) {
            if (error?.code === 'CART_ITEM_NOT_FOUND') {
                return res.status(404).json({ success: false, code: error.code, message: error.message });
            }
            if (error?.code === 'INSUFFICIENT_STOCK') {
                return res.status(409).json({ success: false, code: error.code, available: error.available, message: error.message });
            }
            console.error('[Cart] Lỗi cập nhật giỏ hàng:', error);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi cập nhật giỏ hàng.' });
        }
    }

    // DELETE /api/cart/item/:cartItemId — Xoá một sản phẩm
    async removeCartItem(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const cartItemId = Number(req.params.cartItemId);

            if (!cartItemId) {
                return res.status(400).json({ success: false, code: 'INVALID_BODY', message: 'Thiếu cartItemId.' });
            }

            const cart = await cartService.removeCartItem(userId, cartItemId);
            res.json({ success: true, data: cart });
        } catch (error: any) {
            if (error?.code === 'CART_ITEM_NOT_FOUND') {
                return res.status(404).json({ success: false, code: error.code, message: error.message });
            }
            console.error('[Cart] Lỗi xoá sản phẩm:', error);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi xoá sản phẩm.' });
        }
    }

    // DELETE /api/cart/clear — Xoá toàn bộ giỏ hàng
    async clearCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const cart = await cartService.clearCart(userId);
            res.json({ success: true, code: 'CART_CLEARED', data: cart });
        } catch (error: any) {
            console.error('[Cart] Lỗi xoá giỏ hàng:', error);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi xoá giỏ hàng.' });
        }
    }

    // POST /api/cart/merge — Gộp giỏ khách vãng lai sau đăng nhập
    async mergeCart(req: AuthRequest, res: Response) {
        try {
            const userId = req.user.userId;
            const { items } = req.body;

            if (!Array.isArray(items)) {
                return res.status(400).json({ success: false, code: 'INVALID_BODY', message: 'items phải là mảng.' });
            }

            const cart = await cartService.mergeCart(userId, items);
            res.json({ success: true, code: 'CART_SYNCED', data: cart });
        } catch (error: any) {
            console.error('[Cart] Lỗi gộp giỏ hàng:', error);
            res.status(500).json({ success: false, code: 'MERGE_FAILED', message: 'Không thể gộp giỏ hàng.' });
        }
    }
}

export const cartController = new CartController();
