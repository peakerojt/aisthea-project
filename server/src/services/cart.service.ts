import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

export class CartService {
  async getCartByUserId(userId: number) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { isPrimary: true }
                    }
                  }
                },
                variantAttributes: {
                  include: {
                    value: {
                      include: {
                        attribute: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        where: { isPrimary: true }
                      }
                    }
                  },
                  variantAttributes: {
                    include: {
                      value: {
                        include: {
                          attribute: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    return cart;
  }

  async addToCart(userId: number, variantId: number, quantity: number) {
    const variant = await prisma.productVariant.findUnique({
      where: { variantId }
    });

    if (!variant) {
      throw new Error("Sản phẩm không tồn tại");
    }

    const cart = await this.getCartByUserId(userId);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.cartId,
        variantId: variantId
      }
    });

    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
    if (newQuantity > variant.stockQuantity) {
      throw new Error(`Số lượng yêu cầu (${newQuantity}) vượt quá số lượng tồn kho hiện tại (${variant.stockQuantity})`);
    }

    if (existingItem) {
      return await prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: { quantity: newQuantity }
      });
    } else {
      return await prisma.cartItem.create({
        data: {
          cartId: cart.cartId,
          variantId: variantId,
          quantity: quantity
        }
      });
    }
  }

  async updateCartItem(cartItemId: number, quantity: number) {
    if (quantity <= 0) {
      return await this.removeCartItem(cartItemId);
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { cartItemId },
      include: { variant: true }
    });

    if (!cartItem) {
      throw new Error("Sản phẩm không có trong giỏ hàng");
    }

    if (quantity > cartItem.variant.stockQuantity) {
      throw new Error(`Số lượng yêu cầu (${quantity}) vượt quá số lượng tồn kho hiện tại (${cartItem.variant.stockQuantity})`);
    }

    return await prisma.cartItem.update({
      where: { cartItemId },
      data: { quantity }
    });
  }

  async removeCartItem(cartItemId: number) {
    return await prisma.cartItem.delete({
      where: { cartItemId }
    });
  }
}

export const cartService = new CartService();
