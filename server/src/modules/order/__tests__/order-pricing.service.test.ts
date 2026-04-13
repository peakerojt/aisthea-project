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
  CouponError: class CouponError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
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
        product: { name: 'Bomber', basePrice: 320000 },
        variantAttributes: [{ value: { value: 'White' } }],
      },
      {
        variantId: 22,
        sku: 'SKU-22',
        price: 250000,
        stockQuantity: 4,
        product: { name: 'Pants', basePrice: 250000 },
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
        source: null,
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
        product: { select: { name: true, basePrice: true } },
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

  it('blocks refund benefit vouchers from being combined with sale-priced items', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 250000,
        stockQuantity: 5,
        product: { name: 'Bomber', basePrice: 300000 },
        variantAttributes: [{ value: { value: 'White' } }],
      },
    ]);

    validateCouponMock.mockResolvedValue({
      coupon: {
        couponId: 77,
        code: 'REFUND77',
        type: 'PERCENTAGE',
        value: 10,
        maxDiscountAmount: 50000,
        minOrderValue: 0,
        source: 'REFUND_BENEFIT',
      },
      discountAmount: 25000,
    });

    await expect(
      quoteOrderPricing({
        userId: 7,
        items: [{ variantId: 11, quantity: 1 }],
        couponCode: 'refund77',
        shippingCityCode: '48',
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toMatchObject({
      code: 'REFUND_BENEFIT_NOT_COMBINABLE',
      status: 400,
    });
  });

  it('blocks refund-benefit freeship vouchers when standard shipping is already free', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 600000,
        stockQuantity: 5,
        product: { name: 'Bomber', basePrice: 600000 },
        variantAttributes: [{ value: { value: 'White' } }],
      },
    ]);

    validateCouponMock.mockResolvedValue({
      coupon: {
        couponId: 88,
        code: 'RFBFREE',
        type: 'FIXED_AMOUNT',
        value: 30000,
        maxDiscountAmount: null,
        minOrderValue: 300000,
        source: 'REFUND_BENEFIT',
      },
      discountAmount: 30000,
    });

    await expect(
      quoteOrderPricing({
        userId: 7,
        items: [{ variantId: 11, quantity: 1 }],
        couponCode: 'rfbfree',
        shippingCityCode: '48',
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toMatchObject({
      code: 'FREESHIP_ALREADY_APPLIED',
      status: 400,
    });
  });

  it('caps refund-benefit freeship discounts to the actual shipping fee', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 250000,
        stockQuantity: 5,
        product: { name: 'Bomber', basePrice: 250000 },
        variantAttributes: [{ value: { value: 'White' } }],
      },
    ]);

    validateCouponMock.mockResolvedValue({
      coupon: {
        couponId: 89,
        code: 'RFBFREE',
        type: 'FIXED_AMOUNT',
        value: 30000,
        maxDiscountAmount: null,
        minOrderValue: 300000,
        source: 'REFUND_BENEFIT',
      },
      discountAmount: 30000,
    });

    const result = await quoteOrderPricing({
      userId: 7,
      items: [{ variantId: 11, quantity: 1 }],
      couponCode: 'rfbfree',
      shippingCityCode: '48',
      shippingMethod: 'STANDARD',
    });

    expect(result.shippingFee).toBe(15000);
    expect(result.discountAmount).toBe(15000);
    expect(result.totalAmount).toBe(250000);
  });

  it('rejects malformed shipping city codes instead of trusting client input', async () => {
    prismaMock.productVariant.findMany.mockResolvedValue([
      {
        variantId: 11,
        sku: 'SKU-11',
        price: 300000,
        stockQuantity: 5,
        product: { name: 'Bomber', basePrice: 300000 },
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
