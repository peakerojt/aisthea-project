import { describe, expect, it } from 'vitest';
import {
  createCouponClientSchema,
  checkoutFormSchema,
  forgotPasswordClientSchema,
  loginFormSchema,
  profileAddressClientSchema,
  profileUpdateClientSchema,
  resendVerificationClientSchema,
  resetPasswordClientSchema,
  productStatusUpdateClientSchema,
  signupFormSchema,
  trackingLookupClientSchema,
  validateCouponClientSchema,
  verifyEmailClientSchema,
} from '../schemas';
import { calculatePasswordStrength } from '@/common/utils/passwordValidation';

describe('client shared validation schemas', () => {
  it('normalizes signup data with the same auth rules as backend', () => {
    const parsed = signupFormSchema.parse({
      email: ' USER@Example.COM ',
      fullName: '  Nguyen   Van A ',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      newsletter: true,
    });

    expect(parsed.email).toBe('user@example.com');
    expect(parsed.fullName).toBe('Nguyen Van A');
  });

  it('validates checkout required fields', () => {
    expect(() =>
      checkoutFormSchema.parse({
        email: 'user@example.com',
        fullName: 'Nguyen Van A',
        phone: '0912345678',
        address: '123 Le Loi',
        city: 'Da Nang',
        district: 'Hai Chau',
        ward: 'Thach Thang',
        note: '',
        paymentMethod: 'COD',
      }),
    ).not.toThrow();
  });

  it('normalizes coupon codes before submitting to API', () => {
    const parsed = validateCouponClientSchema.parse({
      code: ' save120 ',
      cartSubtotal: 120000,
    });

    expect(parsed.code).toBe('SAVE120');
  });

  it('keeps login schema aligned with backend minimum requirements', () => {
    expect(() => loginFormSchema.parse({ email: 'bad-email', password: '' })).toThrow();
  });

  it('keeps coupon admin form validation aligned with backend', () => {
    const parsed = createCouponClientSchema.parse({
      code: ' save15 ',
      type: 'PERCENTAGE',
      value: 15,
      maxDiscountAmount: 50000,
      minOrderValue: 200000,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      usageLimit: 100,
      usagePerUser: 1,
      isActive: true,
    });

    expect(parsed.code).toBe('SAVE15');
    expect(parsed.startDate).toBeInstanceOf(Date);
  });

  it('validates address and product status helper schemas', () => {
    expect(profileAddressClientSchema.parse({
      recipientName: ' Nguyen  Van A ',
      phone: '+84 912 345 678',
      addressLine: ' 123 Le Loi ',
      city: ' Da Nang ',
      district: ' Hai Chau ',
      ward: ' Thach Thang ',
      isDefault: true,
    })).toMatchObject({
      recipientName: 'Nguyen Van A',
      phone: '0912345678',
      addressLine: '123 Le Loi',
      city: 'Da Nang',
      district: 'Hai Chau',
      ward: 'Thach Thang',
      isDefault: true,
    });

    expect(productStatusUpdateClientSchema.parse({ status: 'Inactive' }).status).toBe('Inactive');
  });

  it('normalizes profile update payload before submitting', () => {
    expect(profileUpdateClientSchema.parse({
      fullName: '  Nguyen   Van B  ',
      phone: '+84 912 345 678',
    })).toMatchObject({
      fullName: 'Nguyen Van B',
      phone: '0912345678',
    });
  });

  it('keeps auth recovery helpers aligned with backend schemas', () => {
    expect(forgotPasswordClientSchema.parse({ email: ' USER@Example.com ' }).email).toBe('user@example.com');
    expect(resetPasswordClientSchema.parse({ newPassword: 'StrongPass1!' }).newPassword).toBe('StrongPass1!');
    expect(resetPasswordClientSchema.parse({ token: ' 123456 ', newPassword: 'StrongPass1!' }).token).toBe('123456');
    expect(verifyEmailClientSchema.parse({ email: ' USER@Example.com ', code: '123456' })).toMatchObject({
      email: 'user@example.com',
      code: '123456',
    });
    expect(resendVerificationClientSchema.parse({ email: ' USER@Example.com ' }).email).toBe('user@example.com');
  });

  it('normalizes tracking lookup input before submit', () => {
    expect(trackingLookupClientSchema.parse({
      orderCode: ' ORD-2026-001 ',
      contact: '+84 912 345 678',
    })).toMatchObject({
      orderCode: 'ORD-2026-001',
      contact: '0912345678',
    });
  });

  it('calculates password strength without runtime errors', () => {
    expect(calculatePasswordStrength('')).toBe(0);
    expect(calculatePasswordStrength('StrongPass1!')).toBe(5);
  });
});
