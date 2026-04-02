const getRefundsForOrderMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
};

jest.mock('../../services/refund.service', () => {
  class MockRefundError extends Error {
    constructor(
      public code: string,
      public status = 400,
      message = code,
      public details?: Array<{ field?: string; code?: string; message?: string }>,
    ) {
      super(message);
      this.name = 'RefundError';
    }
  }

  return {
    getRefundsForOrder: (...args: unknown[]) => getRefundsForOrderMock(...args),
    RefundError: MockRefundError,
  };
});

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import { RefundError } from '../../services/refund.service';
import { getOrderRefunds } from '../refund.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('refund.controller', () => {
  beforeEach(() => {
    getRefundsForOrderMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('returns INVALID_ORDER_ID when refund history is requested with a non-numeric order id', async () => {
    const req: any = {
      params: { id: 'abc' },
      user: { userId: 7, roles: ['Admin'] },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_ORDER_ID',
    });
    expect(getRefundsForOrderMock).not.toHaveBeenCalled();
  });

  it('returns ADMIN_REQUIRED when refund history is requested without finance access', async () => {
    const req: any = {
      params: { id: '15' },
      user: { userId: 7, roles: ['Support'] },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'ADMIN_REQUIRED',
    });
    expect(getRefundsForOrderMock).not.toHaveBeenCalled();
  });

  it('returns refund history for finance users', async () => {
    getRefundsForOrderMock.mockResolvedValueOnce({
      refunds: [{ refundId: 501, status: 'SUCCESS' }],
      summary: {
        totalCollected: 300000,
        totalRefunded: 100000,
        remainingRefundable: 200000,
      },
    });

    const req: any = {
      params: { id: '18' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(getRefundsForOrderMock).toHaveBeenCalledWith(18);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ refundId: 501, status: 'SUCCESS' }],
      summary: {
        totalCollected: 300000,
        totalRefunded: 100000,
        remainingRefundable: 200000,
      },
    });
  });

  it('maps RefundError when refund history lookup fails', async () => {
    getRefundsForOrderMock.mockRejectedValueOnce(
      new RefundError('FETCH_FAILED', 409, 'FETCH_FAILED', [
        {
          field: 'orderId',
          code: 'ORDER_LOCKED',
          message: 'Order is currently reconciling',
        },
      ]),
    );

    const req: any = {
      params: { id: '18' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FETCH_FAILED',
      details: [
        {
          field: 'orderId',
          code: 'ORDER_LOCKED',
          message: 'Order is currently reconciling',
        },
      ],
    });
  });
});
