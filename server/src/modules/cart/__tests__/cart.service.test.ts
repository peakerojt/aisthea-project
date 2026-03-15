const mockTx = {
  cart: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  productVariant: {
    findMany: jest.fn(),
  },
  cartItem: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

const prismaMock = {
  $transaction: jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
};

jest.mock('../../../lib/prisma', () => ({
  prisma: prismaMock,
}));

import { cartService } from '../cart.service';

describe('cartService.mergeCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads variants and existing items in batch, then applies only needed writes', async () => {
    mockTx.cart.findFirst.mockResolvedValue({ cartId: 55 });
    mockTx.productVariant.findMany.mockResolvedValue([
      { variantId: 1, stockQuantity: 5, isDeleted: false },
      { variantId: 2, stockQuantity: 10, isDeleted: true },
      { variantId: 3, stockQuantity: 1, isDeleted: false },
    ]);
    mockTx.cartItem.findMany.mockResolvedValue([
      { cartItemId: 10, variantId: 1, quantity: 2 },
    ]);

    const getCartSpy = jest.spyOn(cartService, 'getCart').mockResolvedValue({
      cartId: 55,
      items: [],
    } as never);

    await cartService.mergeCart(7, [
      { variantId: 1, quantity: 1 },
      { variantId: 1, quantity: 2 },
      { variantId: 2, quantity: 5 },
      { variantId: 3, quantity: 5 },
      { variantId: 999, quantity: 1 },
      { variantId: 0, quantity: 2 },
    ]);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.productVariant.findMany).toHaveBeenCalledWith({
      where: { variantId: { in: [1, 2, 3, 999] } },
      select: { variantId: true, stockQuantity: true, isDeleted: true },
    });
    expect(mockTx.cartItem.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.cartItem.findMany).toHaveBeenCalledWith({
      where: {
        cartId: 55,
        variantId: { in: [1, 2, 3, 999] },
      },
      select: {
        cartItemId: true,
        variantId: true,
        quantity: true,
      },
    });

    expect(mockTx.cartItem.update).toHaveBeenCalledTimes(1);
    expect(mockTx.cartItem.update).toHaveBeenCalledWith({
      where: { cartItemId: 10 },
      data: { quantity: 5 },
    });

    expect(mockTx.cartItem.create).toHaveBeenCalledTimes(1);
    expect(mockTx.cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: 55,
        variantId: 3,
        quantity: 1,
      },
    });

    expect(getCartSpy).toHaveBeenCalledWith(7);
  });
});
