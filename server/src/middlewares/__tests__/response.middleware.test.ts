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
});
