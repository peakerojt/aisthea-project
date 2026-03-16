const prismaMock = {
  productVariant: {
    findMany: jest.fn(),
  },
};

const validateCouponMock = jest.fn();

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../../services/coupon.service', () => ({
  validateCoupon: (...args: unknown[]) => validateCouponMock(...args),
}));

import { calculateShippingFee, quoteOrderPricing } from '../order-pricing.service';

describe('order-pricing.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates shipping fee from the backend shipping matrix', () => {
    expect(calculateShippingFee('STANDARD', '48', 300000)).toBe(15000);
    expect(calculateShippingFee('EXPRESS', '48', 300000)).toBe(30000);
    expect(calculateShippingFee('STANDARD', '46', 300000)).toBe(25000);
    expect(calculateShippingFee('EXPRESS', '46', 300000)).toBe(40000);
    expect(calculateShippingFee('STANDARD', '01', 300000)).toBe(40000);
    expect(calculateShippingFee('EXPRESS', '01', 300000)).toBe(70000);
    expect(calculateShippingFee('STANDARD', '01', 600000)).toBe(0);
  });

  it('quotes subtotal, shipping, discount, and total from backend data only', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 300000,
        stockQuantity: 5,
        product: { name: 'Bomber' },
        variantAttributes: [{ value: { value: 'White' } }],
      },
      {
        variantId: 22,
        sku: 'SKU-22',
        price: 250000,
        stockQuantity: 4,
        product: { name: 'Pants' },
        variantAttributes: [{ value: { value: 'M' } }],
      },
    ]);

    validateCouponMock.mockResolvedValue({
      coupon: {
        couponId: 9,
        code: 'SAVE120',
        type: 'FIXED_AMOUNT',
        value: 120000,
        maxDiscountAmount: null,
        minOrderValue: 0,
      },
      discountAmount: 120000,
    });

    const result = await quoteOrderPricing({
      userId: 7,
      items: [
        { variantId: 11, quantity: 1 },
        { variantId: 22, quantity: 2 },
      ],
      couponCode: 'save120',
      shippingCityCode: '01',
      shippingMethod: 'STANDARD',
    });

    expect(prismaMock.productVariant.findMany).toHaveBeenCalledWith({
      where: { variantId: { in: [11, 22] } },
      select: {
        variantId: true,
        sku: true,
        price: true,
        stockQuantity: true,
        product: { select: { name: true } },
        variantAttributes: {
          select: {
            value: {
              select: {
                value: true,
              },
            },
          },
        },
      },
    });
    expect(validateCouponMock).toHaveBeenCalledWith('save120', 7, 800000, undefined);
    expect(result.itemsSubtotal).toBe(800000);
    expect(result.shippingFee).toBe(0);
    expect(result.discountAmount).toBe(120000);
    expect(result.totalAmount).toBe(680000);
    expect(result.appliedCouponCode).toBe('SAVE120');
  });

  it('rejects malformed shipping city codes instead of trusting client input', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 300000,
        stockQuantity: 5,
        product: { name: 'Bomber' },
        variantAttributes: [],
      },
    ]);

    await expect(
      quoteOrderPricing({
        userId: 7,
        items: [{ variantId: 11, quantity: 1 }],
        shippingCityCode: 'FREE-SHIP',
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toThrow('orders:errors.invalidShippingCityCode');
  });
});
