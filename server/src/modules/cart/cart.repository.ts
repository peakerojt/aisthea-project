import { prisma } from '../../lib/prisma';

// ─── Include shape re-used across repository methods ─────────────────────────
export const cartInclude = {
    items: {
        include: {
            variant: {
                include: {
                    product: {
                        include: {
                            images: { where: { isPrimary: true }, take: 1 },
                        },
                    },
                    variantAttributes: {
                        include: { value: { include: { attribute: true } } },
                    },
                },
            },
        },
    },
} as const;

export const cartRepository = {
    findByUserId: (userId: number) =>
        prisma.cart.findFirst({ where: { userId }, include: cartInclude }),

    create: (userId: number) =>
        prisma.cart.create({ data: { userId }, include: cartInclude }),

    findItem: (cartItemId: number) =>
        prisma.cartItem.findFirst({
            where: { cartItemId },
            include: { cart: { select: { userId: true } } },
        }),

    findItemByVariant: (cartId: number, variantId: number) =>
        prisma.cartItem.findFirst({ where: { cartId, variantId } }),

    createItem: (cartId: number, variantId: number, quantity: number) =>
        prisma.cartItem.create({ data: { cartId, variantId, quantity } }),

    updateItemQty: (cartItemId: number, quantity: number) =>
        prisma.cartItem.update({ where: { cartItemId }, data: { quantity } }),

    deleteItem: (cartItemId: number) =>
        prisma.cartItem.delete({ where: { cartItemId } }),

    clearItems: (cartId: number) =>
        prisma.cartItem.deleteMany({ where: { cartId } }),

    findVariant: (variantId: number) =>
        prisma.productVariant.findUnique({
            where: { variantId },
            select: { stockQuantity: true, isDeleted: true },
        }),
};
