import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

// ─── Include helper: truy vấn đầy đủ thông tin giỏ hàng ─────────────────────
const cartInclude = {
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
};

export interface LocalCartItem {
  variantId: number;
  quantity: number;
}

export class CartService {
  // ─── Lấy hoặc tạo giỏ hàng cho user ─────────────────────────────────
  async getCart(userId: number) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: cartInclude,
      });
    }

    return cart;
  }

  // ─── Thêm / cập nhật số lượng sản phẩm ───────────────────────────────
  async upsertCartItem(userId: number, variantId: number, quantity: number) {
    // Kiểm tra tồn kho trước khi thêm
    const variant = await prisma.productVariant.findUnique({
      where: { variantId },
      select: { stockQuantity: true, isDeleted: true },
    });

    if (!variant || variant.isDeleted) {
      throw { code: 'VARIANT_NOT_FOUND', message: 'Sản phẩm không tồn tại.' };
    }

    const cart = await this.getCart(userId);

    // Tìm item hiện có trong giỏ
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.cartId, variantId },
    });
    const currentQty = existingItem?.quantity ?? 0;
    const newTotal = currentQty + quantity;

    if (newTotal > variant.stockQuantity) {
      throw {
        code: 'INSUFFICIENT_STOCK',
        available: variant.stockQuantity,
        message: `Chỉ còn ${variant.stockQuantity} sản phẩm trong kho.`,
      };
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: { quantity: newTotal },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.cartId, variantId, quantity },
      });
    }

    return this.getCart(userId);
  }

  // ─── Cập nhật số lượng (set tuyệt đối, 0 = xoá) ──────────────────────
  async updateCartItemQuantity(userId: number, cartItemId: number, quantity: number) {
    const item = await prisma.cartItem.findFirst({
      where: { cartItemId },
      include: { cart: { select: { userId: true } } },
    });

    if (!item || item.cart.userId !== userId) {
      throw { code: 'CART_ITEM_NOT_FOUND', message: 'Không tìm thấy mục giỏ hàng.' };
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { cartItemId } });
    } else {
      // Kiểm tra tồn kho
      const variant = await prisma.productVariant.findUnique({
        where: { variantId: item.variantId },
        select: { stockQuantity: true },
      });

      if (variant && quantity > variant.stockQuantity) {
        throw {
          code: 'INSUFFICIENT_STOCK',
          available: variant.stockQuantity,
          message: `Chỉ còn ${variant.stockQuantity} sản phẩm trong kho.`,
        };
      }

      await prisma.cartItem.update({ where: { cartItemId }, data: { quantity } });
    }

    return this.getCart(userId);
  }

  // ─── Xoá một sản phẩm khỏi giỏ ───────────────────────────────────────
  async removeCartItem(userId: number, cartItemId: number) {
    const item = await prisma.cartItem.findFirst({
      where: { cartItemId },
      include: { cart: { select: { userId: true } } },
    });

    if (!item || item.cart.userId !== userId) {
      throw { code: 'CART_ITEM_NOT_FOUND', message: 'Không tìm thấy mục giỏ hàng.' };
    }

    await prisma.cartItem.delete({ where: { cartItemId } });
    return this.getCart(userId);
  }

  // ─── Xoá toàn bộ giỏ hàng ────────────────────────────────────────────
  async clearCart(userId: number) {
    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });
    }
    return this.getCart(userId);
  }

  // ─── Hợp nhất giỏ khách vãng lai vào giỏ user (sau đăng nhập) ────────
  /**
   * Gộp `localCartItems` (từ localStorage) vào giỏ hàng trên DB:
   *  - Nếu variant đã có trong DB  → cộng thêm số lượng (giới hạn bởi tồn kho)
   *  - Nếu variant chưa có trong DB → tạo mới CartItem
   * Toàn bộ thao tác được bao bởi `prisma.$transaction` để đảm bảo atomic.
   */
  async mergeCart(userId: number, localCartItems: LocalCartItem[]) {
    if (!localCartItems || localCartItems.length === 0) {
      return this.getCart(userId);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Tìm hoặc tạo giỏ hàng user
      let cart = await tx.cart.findFirst({ where: { userId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId } });
      }

      for (const localItem of localCartItems) {
        const { variantId, quantity } = localItem;

        // Bỏ qua item không hợp lệ
        if (!variantId || quantity <= 0) continue;

        // Lấy tồn kho hiện tại
        const variant = await tx.productVariant.findUnique({
          where: { variantId },
          select: { stockQuantity: true, isDeleted: true },
        });

        if (!variant || variant.isDeleted) continue;

        // Tìm item đã có trong giỏ DB
        const existingItem = await tx.cartItem.findFirst({
          where: { cartId: cart.cartId, variantId },
        });

        if (existingItem) {
          // 3. Cộng thêm số lượng, không vượt quá tồn kho
          const merged = Math.min(existingItem.quantity + quantity, variant.stockQuantity);
          await tx.cartItem.update({
            where: { cartItemId: existingItem.cartItemId },
            data: { quantity: merged },
          });
        } else {
          // 4. Tạo mới, giới hạn bởi tồn kho
          const safeQty = Math.min(quantity, variant.stockQuantity);
          if (safeQty > 0) {
            await tx.cartItem.create({
              data: { cartId: cart.cartId, variantId, quantity: safeQty },
            });
          }
        }
      }
    });

    // 5. Trả về giỏ hàng đã gộp (đầy đủ thông tin)
    return this.getCart(userId);
  }
}

export const cartService = new CartService();
