const trackingServiceMock = {
  getPublicTracking: jest.fn(),
  getOrderTrackingById: jest.fn(),
  updateOrderStatus: jest.fn(),
};

jest.mock('../tracking.service', () => ({
  trackingService: trackingServiceMock,
}));

jest.mock('../../../i18n', () => ({
  t: jest.fn((locale: string, key: string, params?: Record<string, unknown>) =>
    params ? `${locale}:${key}:${JSON.stringify(params)}` : `${locale}:${key}`,
  ),
}));

jest.mock('../../../middlewares/locale.middleware', () => ({
  resolveRequestLocale: jest.fn(() => 'vi'),
}));

import { AppError } from '../../../middlewares/error.middleware';
import { trackingController } from '../tracking.controller';

const createResponse = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('tracking.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards validation errors from publicTracking to next()', async () => {
    const req: any = { body: { orderCode: 'ab' } };
    const res = createResponse();
    const next = jest.fn();

    await trackingController.publicTracking(req, res, next);

    expect(trackingServiceMock.getPublicTracking).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      messageKey: 'common:errors.validation',
    });
  });

  it('returns localized success payload for publicTracking', async () => {
    trackingServiceMock.getPublicTracking.mockResolvedValueOnce({
      orderId: 15,
      orderCode: 'ORD-15',
    });

    const req: any = {
      body: {
        orderCode: 'ORD-15',
        contact: '0901234567',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await trackingController.publicTracking(req, res, next);

    expect(trackingServiceMock.getPublicTracking).toHaveBeenCalledWith('ORD-15', '0901234567');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageKey: 'tracking:success.getPublicTracking',
      message: 'vi:tracking:success.getPublicTracking',
      data: { orderId: 15, orderCode: 'ORD-15' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes admin access to getOrderTrackingById for admin users', async () => {
    trackingServiceMock.getOrderTrackingById.mockResolvedValueOnce({ orderId: 22 });

    const req: any = {
      params: { id: '22' },
      user: { userId: 7, roles: ['Admin'] },
    };
    const res = createResponse();
    const next = jest.fn();

    await trackingController.getOrderTracking(req, res, next);

    expect(trackingServiceMock.getOrderTrackingById).toHaveBeenCalledWith(22, {
      userId: 7,
      isAdmin: true,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageKey: 'tracking:success.getOrderTracking',
      message: 'vi:tracking:success.getOrderTracking',
      data: { orderId: 22 },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks non-admin users from adminUpdateOrderStatus', async () => {
    const req: any = {
      params: { id: '30' },
      body: { status: 'CONFIRMED' },
      user: { userId: 8, roles: ['Customer'] },
    };
    const res = createResponse();
    const next = jest.fn();

    await trackingController.adminUpdateOrderStatus(req, res, next);

    expect(trackingServiceMock.updateOrderStatus).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403,
      errorCode: 'FORBIDDEN',
      messageKey: 'tracking:errors.adminOnly',
    });
  });

  it('validates and forwards parsed status updates for adminUpdateOrderStatus', async () => {
    trackingServiceMock.updateOrderStatus.mockResolvedValueOnce({ orderId: 31, status: 'SHIPPED' });

    const req: any = {
      params: { id: '31' },
      body: {
        status: ' SHIPPED ',
        note: ' handed to carrier ',
      },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();
    const next = jest.fn();

    await trackingController.adminUpdateOrderStatus(req, res, next);

    expect(trackingServiceMock.updateOrderStatus).toHaveBeenCalledWith(
      31,
      {
        status: 'SHIPPED',
        note: 'handed to carrier',
      },
      9,
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messageKey: 'tracking:success.updateStatus',
      messageParams: { status: 'SHIPPED' },
      message: 'vi:tracking:success.updateStatus:{"status":"SHIPPED"}',
      data: { orderId: 31, status: 'SHIPPED' },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
