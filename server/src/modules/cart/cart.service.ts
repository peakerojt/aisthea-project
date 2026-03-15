import { cartRepository } from './cart.repository';
import { prisma } from '../../lib/prisma';

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

        const mergedItems = new Map<number, number>();
        for (const { variantId, quantity } of localItems) {
            if (!variantId || quantity <= 0) continue;
            mergedItems.set(variantId, (mergedItems.get(variantId) ?? 0) + quantity);
        }

        const variantIds = [...mergedItems.keys()];
        if (variantIds.length === 0) return this.getCart(userId);

        await prisma.$transaction(async (tx) => {
            let cart = await tx.cart.findFirst({
                where: { userId },
                select: { cartId: true },
            });

            if (!cart) {
                cart = await tx.cart.create({
                    data: { userId },
                    select: { cartId: true },
                });
            }

            const [variants, existingItems] = await Promise.all([
                tx.productVariant.findMany({
                    where: { variantId: { in: variantIds } },
                    select: {
                        variantId: true,
                        stockQuantity: true,
                        isDeleted: true,
                    },
                }),
                tx.cartItem.findMany({
                    where: {
                        cartId: cart.cartId,
                        variantId: { in: variantIds },
                    },
                    select: {
                        cartItemId: true,
                        variantId: true,
                        quantity: true,
                    },
                }),
            ]);

            const variantMap = new Map(variants.map((variant) => [variant.variantId, variant]));
            const existingItemMap = new Map(existingItems.map((item) => [item.variantId, item]));

            for (const [variantId, quantity] of mergedItems.entries()) {
                const variant = variantMap.get(variantId);
                if (!variant || variant.isDeleted) continue;

                const existingItem = existingItemMap.get(variantId);
                const baseQuantity = existingItem?.quantity ?? 0;
                const nextQuantity = Math.min(baseQuantity + quantity, variant.stockQuantity);

                if (existingItem) {
                    if (nextQuantity !== existingItem.quantity) {
                        await tx.cartItem.update({
                            where: { cartItemId: existingItem.cartItemId },
                            data: { quantity: nextQuantity },
                        });
                    }
                    continue;
                }

                if (nextQuantity > 0) {
                    await tx.cartItem.create({
                        data: {
                            cartId: cart.cartId,
                            variantId,
                            quantity: nextQuantity,
                        },
                    });
                }
            }
        });

        return this.getCart(userId);
    },
};
