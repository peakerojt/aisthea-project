const serviceMock = {
  createReturnRequest: jest.fn(),
  getMyReturns: jest.fn(),
  getReturnDetail: jest.fn(),
  getAdminReturns: jest.fn(),
  approveReturnRequest: jest.fn(),
  rejectReturnRequest: jest.fn(),
  markReturnReceived: jest.fn(),
  refundReturnRequest: jest.fn(),
};

jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../services/return-request.service', () => {
  class MockServiceError extends Error {
    constructor(
      public code: string,
      message: string,
      public status = 400,
    ) {
      super(message);
      this.name = 'ServiceError';
    }
  }

  return {
    ReturnRequestService: jest.fn().mockImplementation(() => serviceMock),
    ServiceError: MockServiceError,
  };
});

import { ReturnRequestController } from '../controllers/return-request.controller';
import { ServiceError } from '../services/return-request.service';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ReturnRequestController', () => {
  const controller = new ReturnRequestController();

  beforeEach(() => {
    serviceMock.createReturnRequest.mockReset();
    serviceMock.getMyReturns.mockReset();
    serviceMock.getReturnDetail.mockReset();
    serviceMock.getAdminReturns.mockReset();
    serviceMock.approveReturnRequest.mockReset();
    serviceMock.rejectReturnRequest.mockReset();
    serviceMock.markReturnReceived.mockReset();
    serviceMock.refundReturnRequest.mockReset();
  });

  it('returns unauthorized when creating without an authenticated user', async () => {
    const req: any = {
      user: undefined,
      body: {},
    };
    const res = createResponse();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });
    expect(serviceMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('returns validation error when create payload is invalid', async () => {
    const req: any = {
      user: { userId: 5 },
      body: {
        orderId: 12,
        reason: 'OTHER',
        items: [],
      },
    };
    const res = createResponse();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
    expect(serviceMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('returns a created success envelope when create payload is valid', async () => {
    serviceMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 91,
      orderId: 12,
      status: 'REQUESTED',
    });

    const req: any = {
      user: { userId: 5 },
      body: {
        orderId: 12,
        reason: 'OTHER',
        items: [{ orderItemId: 201, quantity: 1 }],
        attachments: ['https://example.com/proof-91.jpg'],
      },
    };
    const res = createResponse();

    await controller.create(req, res);

    expect(serviceMock.createReturnRequest).toHaveBeenCalledWith(5, {
      orderId: 12,
      reason: 'OTHER',
      items: [{ orderItemId: 201, quantity: 1 }],
      attachments: ['https://example.com/proof-91.jpg'],
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnRequestId: 91,
        orderId: 12,
        status: 'REQUESTED',
      },
    });
  });

  it('forwards customer pagination params to myReturns', async () => {
    serviceMock.getMyReturns.mockResolvedValueOnce({
      data: [{ returnRequestId: 88 }],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });

    const req: any = {
      query: { page: '2', limit: '5' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await controller.myReturns(req, res);

    expect(serviceMock.getMyReturns).toHaveBeenCalledWith(5, 2, 5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        data: [{ returnRequestId: 88 }],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      },
    });
  });

  it('blocks customers from viewing another user return detail', async () => {
    serviceMock.getReturnDetail.mockResolvedValueOnce({
      returnRequestId: 77,
      userId: 99,
      status: 'REQUESTED',
    });

    const req: any = {
      params: { id: '77' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await controller.detail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient access rights' },
    });
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it('allows support users to view another customer return detail via role fallback', async () => {
    serviceMock.getReturnDetail.mockResolvedValueOnce({
      returnRequestId: 78,
      userId: 99,
      status: 'REQUESTED',
    });

    const req: any = {
      params: { id: '78' },
      user: { userId: 5, role: 'Support' },
    };
    const res = createResponse();

    await controller.detail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnRequestId: 78,
        userId: 99,
        status: 'REQUESTED',
      },
    });
  });

  it('returns NOT_FOUND when detail lookup misses', async () => {
    serviceMock.getReturnDetail.mockResolvedValueOnce(null);

    const req: any = {
      params: { id: '79' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await controller.detail(req, res);

    expect(serviceMock.getReturnDetail).toHaveBeenCalledWith(79);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Return request not found' },
    });
  });

  it('forwards admin list filters and returns a success envelope', async () => {
    serviceMock.getAdminReturns.mockResolvedValueOnce({
      data: [{ returnRequestId: 120 }],
      total: 1,
      page: 3,
      limit: 20,
      totalPages: 1,
    });

    const req: any = {
      query: { page: '3', limit: '20', status: 'REQUESTED' },
    };
    const res = createResponse();

    await controller.adminList(req, res);

    expect(serviceMock.getAdminReturns).toHaveBeenCalledWith({
      page: 3,
      limit: 20,
      status: 'REQUESTED',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        data: [{ returnRequestId: 120 }],
        total: 1,
        page: 3,
        limit: 20,
        totalPages: 1,
      },
    });
  });

  it('returns validation errors for invalid admin list filters', async () => {
    const req: any = {
      query: { status: 'INVALID_STATUS', page: '0' },
    };
    const res = createResponse();

    await controller.adminList(req, res);

    expect(serviceMock.getAdminReturns).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('returns a success envelope for approve actions', async () => {
    serviceMock.approveReturnRequest.mockResolvedValueOnce({
      returnRequestId: 15,
      orderId: 205,
      status: 'APPROVED',
    });

    const req: any = {
      params: { id: '15' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.approve(req, res);

    expect(serviceMock.approveReturnRequest).toHaveBeenCalledWith(15, 9);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnRequestId: 15,
        orderId: 205,
        status: 'APPROVED',
      },
    });
  });

  it('returns a success envelope for reject actions', async () => {
    serviceMock.rejectReturnRequest.mockResolvedValueOnce({
      returnRequestId: 17,
      orderId: 207,
      status: 'REJECTED',
    });

    const req: any = {
      params: { id: '17' },
      body: { reason: 'Out of policy' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.reject(req, res);

    expect(serviceMock.rejectReturnRequest).toHaveBeenCalledWith(17, 9, 'Out of policy');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnRequestId: 17,
        orderId: 207,
        status: 'REJECTED',
      },
    });
  });

  it('returns a success envelope for mark-received actions', async () => {
    serviceMock.markReturnReceived.mockResolvedValueOnce({
      returnRequestId: 16,
      orderId: 206,
      status: 'RECEIVED',
    });

    const req: any = {
      params: { id: '16' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.markReceived(req, res);

    expect(serviceMock.markReturnReceived).toHaveBeenCalledWith(16, 9);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnRequestId: 16,
        orderId: 206,
        status: 'RECEIVED',
      },
    });
  });

  it('returns service error envelopes for reject failures', async () => {
    serviceMock.rejectReturnRequest.mockRejectedValueOnce(
      new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404),
    );

    const req: any = {
      params: { id: '15' },
      body: { reason: 'Out of policy' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.reject(req, res);

    expect(serviceMock.rejectReturnRequest).toHaveBeenCalledWith(15, 9, 'Out of policy');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RETURN_REQUEST_NOT_FOUND',
        message: 'Return request not found',
      },
    });
  });

  it('returns success envelopes for refund actions', async () => {
    serviceMock.refundReturnRequest.mockResolvedValueOnce({
      refundTransactionId: 101,
      status: 'COMPLETED',
      method: 'ORIGINAL_PAYMENT',
    });

    const req: any = {
      params: { id: '55' },
      body: {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'refund-key-1234',
        amount: 150000,
      },
      user: { userId: 88, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.refund(req, res);

    expect(serviceMock.refundReturnRequest).toHaveBeenCalledWith(55, 88, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'refund-key-1234',
      amount: 150000,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        refundTransactionId: 101,
        status: 'COMPLETED',
        method: 'ORIGINAL_PAYMENT',
      },
    });
  });

  it('returns validation errors for invalid refund payloads', async () => {
    const req: any = {
      params: { id: '55' },
      body: {
        method: 'INVALID_METHOD',
        idempotencyKey: 'short',
      },
      user: { userId: 88, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.refund(req, res);

    expect(serviceMock.refundReturnRequest).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('returns service error envelopes for refund failures', async () => {
    serviceMock.refundReturnRequest.mockRejectedValueOnce(
      new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404),
    );

    const req: any = {
      params: { id: '55' },
      body: {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'refund-key-404',
      },
      user: { userId: 88, roles: ['Admin'] },
    };
    const res = createResponse();

    await controller.refund(req, res);

    expect(serviceMock.refundReturnRequest).toHaveBeenCalledWith(55, 88, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'refund-key-404',
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RETURN_REQUEST_NOT_FOUND',
        message: 'Return request not found',
      },
    });
  });
});
