import { cartRepository } from './cart.repository';

export interface LocalCartItem {
    variantId: number;
    quantity: number;
}

export const cartService = {
    // ─── Get or create cart for a user ───────────────────────────────────────
    async getCart(userId: number) {
        let cart = await cartRepository.findByUserId(userId);
        if (!cart) cart = await cartRepository.create(userId);
        return cart;
    },

    // ─── Add / increment item ─────────────────────────────────────────────────
    async upsertCartItem(userId: number, variantId: number, quantity: number) {
        const variant = await cartRepository.findVariant(variantId);
        if (!variant || variant.isDeleted) {
            throw { code: 'VARIANT_NOT_FOUND', message: 'Sản phẩm không tồn tại.' };
        }

        const cart = await this.getCart(userId);
        const existing = await cartRepository.findItemByVariant(cart.cartId, variantId);
        const currentQty = existing?.quantity ?? 0;
        const newTotal = currentQty + quantity;

        if (newTotal > variant.stockQuantity) {
            throw {
                code: 'INSUFFICIENT_STOCK',
                available: variant.stockQuantity,
                message: `Chỉ còn ${variant.stockQuantity} sản phẩm trong kho.`,
            };
        }

        if (existing) {
            await cartRepository.updateItemQty(existing.cartItemId, newTotal);
        } else {
            await cartRepository.createItem(cart.cartId, variantId, quantity);
        }

        return this.getCart(userId);
    },

    // ─── Update item quantity (absolute) ────────────────────────────────────
    async updateCartItemQuantity(userId: number, cartItemId: number, quantity: number) {
        const item = await cartRepository.findItem(cartItemId);
        if (!item || item.cart.userId !== userId) {
            throw { code: 'CART_ITEM_NOT_FOUND', message: 'Không tìm thấy mục giỏ hàng.' };
        }

        if (quantity <= 0) {
            await cartRepository.deleteItem(cartItemId);
        } else {
            const variant = await cartRepository.findVariant(item.variantId);
            if (variant && quantity > variant.stockQuantity) {
                throw {
                    code: 'INSUFFICIENT_STOCK',
                    available: variant.stockQuantity,
                    message: `Chỉ còn ${variant.stockQuantity} sản phẩm trong kho.`,
                };
            }
            await cartRepository.updateItemQty(cartItemId, quantity);
        }

        return this.getCart(userId);
    },

    // ─── Remove single item ──────────────────────────────────────────────────
    async removeCartItem(userId: number, cartItemId: number) {
        const item = await cartRepository.findItem(cartItemId);
        if (!item || item.cart.userId !== userId) {
            throw { code: 'CART_ITEM_NOT_FOUND', message: 'Không tìm thấy mục giỏ hàng.' };
        }
        await cartRepository.deleteItem(cartItemId);
        return this.getCart(userId);
    },

    // ─── Clear entire cart ────────────────────────────────────────────────────
    async clearCart(userId: number) {
        const cart = await cartRepository.findByUserId(userId);
        if (cart) await cartRepository.clearItems(cart.cartId);
        return this.getCart(userId);
    },

    // ─── Merge guest cart (localStorage) into DB cart after login ────────────
    async mergeCart(userId: number, localItems: LocalCartItem[]) {
        if (!localItems?.length) return this.getCart(userId);

        // Re-use existing cart logic inside a transaction via repository
        const cart = await this.getCart(userId);

        for (const { variantId, quantity } of localItems) {
            if (!variantId || quantity <= 0) continue;

            const variant = await cartRepository.findVariant(variantId);
            if (!variant || variant.isDeleted) continue;

            const existing = await cartRepository.findItemByVariant(cart.cartId, variantId);
            if (existing) {
                const merged = Math.min(existing.quantity + quantity, variant.stockQuantity);
                await cartRepository.updateItemQty(existing.cartItemId, merged);
            } else {
                const safeQty = Math.min(quantity, variant.stockQuantity);
                if (safeQty > 0) await cartRepository.createItem(cart.cartId, variantId, safeQty);
            }
        }

        return this.getCart(userId);
    },
};
