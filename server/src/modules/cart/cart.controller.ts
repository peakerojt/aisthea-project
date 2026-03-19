import { Response } from 'express';
import { cartService } from './cart.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { logger } from '../../lib/logger';
import type { AddToCartInput, MergeCartInput, UpdateCartItemInput } from './cart.validator';

export const cartController = {
    // GET /api/cart
    async getCart(req: AuthRequest, res: Response) {
        try {
            const cart = await cartService.getCart(req.user.userId);
            res.json({ success: true, data: cart });
        } catch (error) {
            logger.error('[cart] getCart failed', { error });
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi lấy giỏ hàng.' });
        }
    },

    // POST /api/cart/add
    async addToCart(req: AuthRequest, res: Response) {
        try {
            const { variantId, quantity } = req.body as AddToCartInput;
            const cart = await cartService.upsertCartItem(req.user.userId, Number(variantId), Number(quantity));
            res.json({ success: true, code: 'CART_ITEM_ADDED', data: cart });
        } catch (error: unknown) {
            const e = error as { code?: string; available?: number; message?: string };
            if (e?.code === 'INSUFFICIENT_STOCK') return res.status(409).json({ success: false, ...e });
            if (e?.code === 'VARIANT_NOT_FOUND') return res.status(404).json({ success: false, ...e });
            logger.error('[cart] addToCart failed', { error });
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi thêm sản phẩm.' });
        }
    },

    // PUT /api/cart/update
    async updateCartItem(req: AuthRequest, res: Response) {
        try {
            const { cartItemId, quantity } = req.body as UpdateCartItemInput;
            const cart = await cartService.updateCartItemQuantity(req.user.userId, Number(cartItemId), Number(quantity));
            res.json({ success: true, data: cart });
        } catch (error: unknown) {
            const e = error as { code?: string; available?: number; message?: string };
            if (e?.code === 'CART_ITEM_NOT_FOUND') return res.status(404).json({ success: false, ...e });
            if (e?.code === 'INSUFFICIENT_STOCK') return res.status(409).json({ success: false, ...e });
            logger.error('[cart] updateCartItem failed', { error });
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi cập nhật giỏ hàng.' });
        }
    },

    // DELETE /api/cart/item/:cartItemId
    async removeCartItem(req: AuthRequest, res: Response) {
        try {
            const cartItemId = Number(req.params.cartItemId);
            const cart = await cartService.removeCartItem(req.user.userId, cartItemId);
            res.json({ success: true, data: cart });
        } catch (error: unknown) {
            const e = error as { code?: string; message?: string };
            if (e?.code === 'CART_ITEM_NOT_FOUND') return res.status(404).json({ success: false, ...e });
            logger.error('[cart] removeCartItem failed', { error });
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi xoá sản phẩm.' });
        }
    },

    // DELETE /api/cart/clear
    async clearCart(req: AuthRequest, res: Response) {
        try {
            const cart = await cartService.clearCart(req.user.userId);
            res.json({ success: true, code: 'CART_CLEARED', data: cart });
        } catch (error) {
            logger.error('[cart] clearCart failed', { error });
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi khi xoá giỏ hàng.' });
        }
    },

    // POST /api/cart/merge
    async mergeCart(req: AuthRequest, res: Response) {
        try {
            const { items } = req.body as MergeCartInput;
            const cart = await cartService.mergeCart(req.user.userId, items);
            res.json({ success: true, code: 'CART_SYNCED', data: cart });
        } catch (error) {
            logger.error('[cart] mergeCart failed', { error });
            res.status(500).json({ success: false, code: 'MERGE_FAILED', message: 'Không thể gộp giỏ hàng.' });
        }
    },
};
