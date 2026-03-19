import {
  addressIdParamSchema,
  createCouponSchema,
  createOrderSchema,
  registerSchema,
  updateProductStatusSchema,
} from '../index';

describe('shared validation schemas', () => {
  it('normalizes register payload and enforces strong passwords', () => {
    const parsed = registerSchema.parse({
      email: '  USER@Example.COM ',
      password: 'StrongPass1!',
      fullName: '  Nguyen   Van A  ',
    });

    expect(parsed).toEqual({
      email: 'user@example.com',
      password: 'StrongPass1!',
      fullName: 'Nguyen Van A',
    });
  });

  it('rejects unknown fields on checkout payloads', () => {
    expect(() =>
      createOrderSchema.parse({
        paymentMethod: 'COD',
        customerName: 'Nguyen Van A',
        customerEmail: 'user@example.com',
        customerPhone: '0912345678',
        shippingCity: 'Da Nang',
        shippingDistrict: 'Hai Chau',
        shippingWard: 'Thach Thang',
        shippingAddressDetail: '123 Le Loi',
        items: [{ variantId: 1, quantity: 2 }],
        shippingCityCode: '48',
        shippingMethod: 'STANDARD',
        unexpected: true,
      }),
    ).toThrow();
  });

  it('normalizes admin coupon payloads and coerces dates', () => {
    const parsed = createCouponSchema.parse({
      code: ' save120 ',
      type: 'PERCENTAGE',
      value: 15,
      maxDiscountAmount: 50000,
      minOrderValue: 200000,
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z',
      usageLimit: 100,
      usagePerUser: 1,
      isActive: true,
    });

    expect(parsed.code).toBe('SAVE120');
    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.endDate).toBeInstanceOf(Date);
  });

  it('validates shared params and product status payloads', () => {
    expect(addressIdParamSchema.parse({ id: '12' }).id).toBe(12);
    expect(updateProductStatusSchema.parse({ status: 'Archived' }).status).toBe('Archived');
  });
});
