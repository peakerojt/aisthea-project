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
    const cart = await this.getCartByUserId(userId);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.cartId,
        variantId: variantId
      }
    });

    if (existingItem) {
      return await prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: { quantity: existingItem.quantity + quantity }
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
