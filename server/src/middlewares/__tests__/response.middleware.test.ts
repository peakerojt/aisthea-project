import { initI18n } from '../../i18n';
import { normalizeApiResponseBody } from '../response.middleware';

describe('response.middleware i18n normalization', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('localizes error messages from errorCode when locale is vi', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/orders/1/refunds',
      originalUrl: '/api/orders/1/refunds',
    };

    const payload = normalizeApiResponseBody(req, 400, {
      success: false,
      errorCode: 'ORDER_NOT_PAID',
    }) as Record<string, unknown>;

    expect(payload.messageKey).toBe('payments:errors.orderNotPaid');
    expect(payload.message).toBe('Đơn hàng chưa được thanh toán nên không thể hoàn tiền.');
  });

  it('localizes success messages from success code when locale is vi', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/orders/1/confirm-receipt',
      originalUrl: '/api/orders/1/confirm-receipt',
    };

    const payload = normalizeApiResponseBody(req, 200, {
      success: true,
      code: 'RECEIPT_CONFIRMED',
    }) as Record<string, unknown>;

    expect(payload.messageKey).toBe('orders:success.receiptConfirmed');
    expect(payload.message).toBe('Xác nhận đã nhận hàng thành công.');
  });

  it('prefers localized messageKey over raw english text when locale is vi', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/auth/login',
      originalUrl: '/api/auth/login',
    };

    const payload = normalizeApiResponseBody(req, 401, {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      messageKey: 'auth:errors.invalidCredentials',
      message: 'Invalid email or password.',
    }) as Record<string, unknown>;

    expect(payload.messageKey).toBe('auth:errors.invalidCredentials');
    expect(payload.message).toBe('Email hoặc mật khẩu không chính xác.');
  });

  it('interpolates success message params during normalization', () => {
    const req: any = {
      locale: 'en',
      path: '/api/admin/orders/1/status',
      originalUrl: '/api/admin/orders/1/status',
    };

    const payload = normalizeApiResponseBody(req, 200, {
      success: true,
      messageKey: 'tracking:success.updateStatus',
      messageParams: { status: 'CONFIRMED' },
    }) as Record<string, unknown>;

    expect(payload.message).toBe("Order status has been updated to 'CONFIRMED' successfully.");
  });

  it('interpolates error message params during normalization', () => {
    const req: any = {
      locale: 'en',
      path: '/api/admin/orders/1/status',
      originalUrl: '/api/admin/orders/1/status',
    };

    const payload = normalizeApiResponseBody(req, 400, {
      success: false,
      errorCode: 'INVALID_STATUS_TRANSITION',
      messageKey: 'tracking:errors.invalidStatusTransition',
      messageParams: { from: 'DELIVERED', to: 'PENDING' },
    }) as Record<string, unknown>;

    expect(payload.message).toBe("Cannot transition order from 'DELIVERED' to 'PENDING'. Check allowed transitions.");
  });

  it('preserves nested error envelopes from module controllers instead of downgrading them to UNKNOWN_ERROR', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/return-requests',
      originalUrl: '/api/return-requests',
    };

    const payload = normalizeApiResponseBody(req, 400, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Each return item must include an explicit reasonCode',
        details: {
          path: ['items', 0, 'reasonCode'],
        },
      },
    }) as Record<string, unknown>;

    expect(payload.errorCode).toBe('VALIDATION_ERROR');
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(payload.message).toBe('Each return item must include an explicit reasonCode');
    expect(payload.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Each return item must include an explicit reasonCode',
      details: {
        path: ['items', 0, 'reasonCode'],
      },
    });
  });

  it('localizes invalid return quantity using details as interpolation params', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/return-requests',
      originalUrl: '/api/return-requests',
    };

    const payload = normalizeApiResponseBody(req, 400, {
      success: false,
      error: {
        code: 'INVALID_RETURN_QUANTITY',
        message: 'Return quantity exceeds allowed limit for Ao hoodie Vintage - Trang / S (max 1)',
        details: {
          orderItemId: 28,
          maxQty: 1,
          productLabel: 'Ao hoodie Vintage - Trang / S',
        },
      },
    }) as Record<string, unknown>;

    expect(payload.errorCode).toBe('INVALID_RETURN_QUANTITY');
    expect(payload.messageKey).toBe('returns:errors.invalidReturnQuantity');
    expect(payload.message).toBe('Số lượng trả vượt quá giới hạn cho phép cho Ao hoodie Vintage - Trang / S (tối đa 1).');
  });

  it('bypasses normalization for the VNPay query fallback route', () => {
    const req: any = {
      locale: 'vi',
      path: '/api/vnpay/vnpay_query',
      originalUrl: '/api/vnpay/vnpay_query',
    };

    const rawPayload = {
      message: 'Needs review',
      code: '91',
      orderId: 22,
      paymentStatus: 'NEEDS_REVIEW',
      queryStatus: '05',
    };

    expect(normalizeApiResponseBody(req, 200, rawPayload)).toEqual(rawPayload);
  });
});
