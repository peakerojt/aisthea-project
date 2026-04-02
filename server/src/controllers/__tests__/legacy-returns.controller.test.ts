const getReturnForOrderMock = jest.fn();
const getReturnDetailByOrderIdMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
};

jest.mock('../../services/return.service', () => {
  class MockReturnError extends Error {
    constructor(
      public code: string,
      public status = 400,
      message = code,
    ) {
      super(message);
      this.name = 'ReturnError';
    }
  }

  return {
    getReturnForOrder: (...args: unknown[]) => getReturnForOrderMock(...args),
    ReturnError: MockReturnError,
  };
});

jest.mock('../../modules/return-order/services/request.service', () => ({
  ReturnRequestService: jest.fn().mockImplementation(() => ({
    getReturnDetailByOrderId: (...args: unknown[]) => getReturnDetailByOrderIdMock(...args),
  })),
}));

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import { getOrderReturn } from '../legacy-returns.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('legacy-returns.controller', () => {
  beforeEach(() => {
    getReturnForOrderMock.mockReset();
    getReturnDetailByOrderIdMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('returns INVALID_ORDER_ID when getOrderReturn receives a bad id', async () => {
    const req: any = {
      params: { id: 'abc' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_ORDER_ID',
    });
  });

  it('returns the merged legacy/modern order return detail envelope', async () => {
    getReturnForOrderMock.mockResolvedValueOnce({
      returnId: 81,
      orderId: 501,
      status: 'REQUESTED',
      proofImages: ['https://example.com/proof-legacy.jpg'],
    });
    getReturnDetailByOrderIdMock.mockResolvedValueOnce({
      returnRequestId: 181,
      orderId: 501,
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
      attachments: [{ fileUrl: 'https://example.com/proof-modern.jpg' }],
    });

    const req: any = {
      params: { id: '81' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(getReturnForOrderMock).toHaveBeenCalledWith(81);
    expect(getReturnDetailByOrderIdMock).toHaveBeenCalledWith(81);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        orderId: 501,
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'PENDING',
      }),
    });
  });
});
