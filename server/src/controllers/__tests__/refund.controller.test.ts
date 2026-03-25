const initiateRefundMock = jest.fn();
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
    ) {
      super(message);
      this.name = 'RefundError';
    }
  }

  return {
    initiateRefund: (...args: unknown[]) => initiateRefundMock(...args),
    getRefundsForOrder: (...args: unknown[]) => getRefundsForOrderMock(...args),
    RefundError: MockRefundError,
  };
});

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import { RefundError } from '../../services/refund.service';
import { getOrderRefunds, postInitiateRefund } from '../refund.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('refund.controller', () => {
  beforeEach(() => {
    initiateRefundMock.mockReset();
    getRefundsForOrderMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('returns INVALID_ORDER_ID when initiating refund with a non-numeric order id', async () => {
    const req: any = {
      params: { id: 'abc' },
      body: {},
      user: { userId: 7 },
    };
    const res = createResponse();

    await postInitiateRefund(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_ORDER_ID',
    });
    expect(initiateRefundMock).not.toHaveBeenCalled();
  });

  it('returns MISSING_REQUIRED_FIELDS when payload is incomplete', async () => {
    const req: any = {
      params: { id: '15' },
      body: {
        amount: 150000,
        type: 'PARTIAL',
        reason: 'Missing method should fail',
      },
      user: { userId: 7 },
    };
    const res = createResponse();

    await postInitiateRefund(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'MISSING_REQUIRED_FIELDS',
    });
    expect(initiateRefundMock).not.toHaveBeenCalled();
  });

  it('maps RefundError to the configured status/code when initiating refund fails', async () => {
    initiateRefundMock.mockRejectedValueOnce(new RefundError('OVER_REFUND', 400));

    const req: any = {
      params: { id: '15' },
      body: {
        amount: 150000,
        type: 'PARTIAL',
        method: 'BANK_TRANSFER',
        reason: 'Requested partial refund',
      },
      user: { userId: 7 },
    };
    const res = createResponse();

    await postInitiateRefund(req, res);

    expect(initiateRefundMock).toHaveBeenCalledWith(15, 7, {
      amount: 150000,
      type: 'PARTIAL',
      method: 'BANK_TRANSFER',
      reason: 'Requested partial refund',
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'OVER_REFUND',
    });
  });

  it('returns REFUND_INITIATED when refund creation succeeds', async () => {
    initiateRefundMock.mockResolvedValueOnce({
      refundId: 501,
      status: 'SUCCESS',
    });

    const req: any = {
      params: { id: '18' },
      body: {
        amount: '200000',
        type: 'FULL',
        method: 'BANK_TRANSFER',
        reason: 'Manual refund approved',
      },
      user: { userId: 9 },
    };
    const res = createResponse();

    await postInitiateRefund(req, res);

    expect(initiateRefundMock).toHaveBeenCalledWith(18, 9, {
      amount: 200000,
      type: 'FULL',
      method: 'BANK_TRANSFER',
      reason: 'Manual refund approved',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'REFUND_INITIATED',
      data: {
        refundId: 501,
        status: 'SUCCESS',
      },
    });
  });

  it('logs and returns INTERNAL_SERVER_ERROR for unexpected initiateRefund failures', async () => {
    const error = new Error('db offline');
    initiateRefundMock.mockRejectedValueOnce(error);

    const req: any = {
      params: { id: '19' },
      body: {
        amount: 100000,
        type: 'PARTIAL',
        method: 'BANK_TRANSFER',
        reason: 'Retry refund',
      },
      user: { userId: 9 },
    };
    const res = createResponse();

    await postInitiateRefund(req, res);

    expect(loggerMock.error).toHaveBeenCalledWith('[refundController] postInitiateRefund failed', {
      error,
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('returns refund history for a valid order id', async () => {
    getRefundsForOrderMock.mockResolvedValueOnce([
      { refundId: 2 },
      { refundId: 1 },
    ]);

    const req: any = {
      params: { id: '21' },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(getRefundsForOrderMock).toHaveBeenCalledWith(21);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ refundId: 2 }, { refundId: 1 }],
    });
  });

  it('logs and returns FETCH_REFUND_HISTORY_FAILED when history lookup crashes', async () => {
    const error = new Error('query failed');
    getRefundsForOrderMock.mockRejectedValueOnce(error);

    const req: any = {
      params: { id: '21' },
    };
    const res = createResponse();

    await getOrderRefunds(req, res);

    expect(loggerMock.error).toHaveBeenCalledWith('[refundController] getOrderRefunds failed', {
      error,
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FETCH_REFUND_HISTORY_FAILED',
    });
  });
});
