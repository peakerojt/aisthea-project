import {
  addressIdParamSchema,
  createCouponSchema,
  createOrderSchema,
  registerSchema,
  updateCouponSchema,
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const parsed = createCouponSchema.parse({
      code: ' save120 ',
      type: 'PERCENTAGE',
      value: 15,
      maxDiscountAmount: 50000,
      minOrderValue: 500000,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      usageLimit: 100,
      usagePerUser: 1,
      isActive: true,
    });

    expect(parsed.code).toBe('SAVE120');
    expect(parsed.startDate).toBeInstanceOf(Date);
    expect(parsed.endDate).toBeInstanceOf(Date);
  });

  it('rejects coupon dates that are in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(() =>
      createCouponSchema.parse({
        code: 'SAVE120',
        type: 'PERCENTAGE',
        value: 15,
        maxDiscountAmount: 50000,
        minOrderValue: 500000,
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
        usageLimit: 100,
        usagePerUser: 1,
        isActive: true,
      }),
    ).toThrow('Ngày bắt đầu không được ở quá khứ');

    expect(() =>
      updateCouponSchema.parse({
        endDate: yesterday.toISOString(),
      }),
    ).toThrow('Ngày kết thúc không được ở quá khứ');
  });

  it('rejects coupon min order values outside preset rules', () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    expect(() =>
      createCouponSchema.parse({
        code: 'SAVE120',
        type: 'PERCENTAGE',
        value: 15,
        maxDiscountAmount: 50000,
        minOrderValue: 200000,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        usageLimit: 100,
        usagePerUser: 1,
        isActive: true,
      }),
    ).toThrow('Điều kiện đơn tối thiểu chỉ chấp nhận các mức');
  });

  it('validates shared params and product status payloads', () => {
    expect(addressIdParamSchema.parse({ id: '12' }).id).toBe(12);
    expect(updateProductStatusSchema.parse({ status: 'Archived' }).status).toBe('Archived');
  });
});
