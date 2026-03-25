const requestReturnMock = jest.fn();
const processReturnMock = jest.fn();
const listReturnsMock = jest.fn();
const getReturnForOrderMock = jest.fn();
const getReturnDetailByOrderIdMock = jest.fn();
const getAdminReturnRequestsMock = jest.fn();
const approveReturnRequestMock = jest.fn();
const rejectReturnRequestMock = jest.fn();
const markReturnReceivedMock = jest.fn();
const refundReturnRequestMock = jest.fn();
const getReturnDetailMock = jest.fn();
const createLegacyCompatibleReturnRequestMock = jest.fn();
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
    requestReturn: (...args: unknown[]) => requestReturnMock(...args),
    processReturn: (...args: unknown[]) => processReturnMock(...args),
    listReturns: (...args: unknown[]) => listReturnsMock(...args),
    getReturnForOrder: (...args: unknown[]) => getReturnForOrderMock(...args),
    ReturnError: MockReturnError,
  };
});

jest.mock('../../modules/return-order/services/return-request.service', () => ({
  ServiceError: class MockServiceError extends Error {
    constructor(
      public code: string,
      message: string,
      public status = 400,
    ) {
      super(message);
      this.name = 'ServiceError';
    }
  },
  ReturnRequestService: jest.fn().mockImplementation(() => ({
    getAdminReturns: (...args: unknown[]) => getAdminReturnRequestsMock(...args),
    approveReturnRequest: (...args: unknown[]) => approveReturnRequestMock(...args),
    rejectReturnRequest: (...args: unknown[]) => rejectReturnRequestMock(...args),
    markReturnReceived: (...args: unknown[]) => markReturnReceivedMock(...args),
    refundReturnRequest: (...args: unknown[]) => refundReturnRequestMock(...args),
    getReturnDetail: (...args: unknown[]) => getReturnDetailMock(...args),
    getReturnDetailByOrderId: (...args: unknown[]) => getReturnDetailByOrderIdMock(...args),
    createLegacyCompatibleReturnRequest: (...args: unknown[]) =>
      createLegacyCompatibleReturnRequestMock(...args),
  })),
}));

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import { ReturnError } from '../../services/return.service';
import { ServiceError } from '../../modules/return-order/services/return-request.service';
import {
  getAdminReturns,
  getOrderReturn,
  patchProcessReturn,
  postReturnRequest,
} from '../return.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('return.controller', () => {
  beforeEach(() => {
    requestReturnMock.mockReset();
    processReturnMock.mockReset();
    listReturnsMock.mockReset();
    getReturnForOrderMock.mockReset();
    getReturnDetailByOrderIdMock.mockReset();
    getAdminReturnRequestsMock.mockReset();
    approveReturnRequestMock.mockReset();
    rejectReturnRequestMock.mockReset();
    markReturnReceivedMock.mockReset();
    refundReturnRequestMock.mockReset();
    getReturnDetailMock.mockReset();
    createLegacyCompatibleReturnRequestMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('returns REASON_REQUIRED when posting a return request without a reason', async () => {
    const req: any = {
      params: { id: '12' },
      body: { reason: '   ' },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'REASON_REQUIRED',
    });
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it('passes trimmed reason and proof images to requestReturn', async () => {
    createLegacyCompatibleReturnRequestMock.mockRejectedValueOnce(
      new ServiceError(
        'LEGACY_CREATE_REQUIRES_ITEM_SELECTION',
        'Legacy create flow requires explicit item selection before migration',
        409,
      ),
    );
    requestReturnMock.mockResolvedValueOnce({
      returnId: 41,
      status: 'PENDING_APPROVAL',
    });

    const req: any = {
      params: { id: '12' },
      body: {
        reason: '  Wrong item received  ',
        proofImages: ['https://example.com/proof-1.jpg'],
      },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(createLegacyCompatibleReturnRequestMock).toHaveBeenCalledWith(5, {
      orderId: 12,
      reason: 'Wrong item received',
      proofImages: ['https://example.com/proof-1.jpg'],
    });
    expect(requestReturnMock).toHaveBeenCalledWith(
      12,
      5,
      ['Customer'],
      'Wrong item received',
      ['https://example.com/proof-1.jpg'],
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnId: 41,
        status: 'PENDING_APPROVAL',
      },
    });
  });

  it('uses the return-request compatibility path for safe single-item legacy create requests', async () => {
    createLegacyCompatibleReturnRequestMock.mockResolvedValueOnce({
      returnRequestId: 142,
      orderId: 12,
      status: 'REQUESTED',
    });

    const req: any = {
      params: { id: '12' },
      body: {
        reason: '  Wrong item received  ',
        proofImages: ['https://example.com/proof-2.jpg'],
      },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(createLegacyCompatibleReturnRequestMock).toHaveBeenCalledWith(5, {
      orderId: 12,
      reason: 'Wrong item received',
      proofImages: ['https://example.com/proof-2.jpg'],
    });
    expect(requestReturnMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnId: 142,
        orderId: 12,
        status: 'REQUESTED',
      },
    });
  });

  it('returns ServiceError envelopes from the compatibility path without falling back to legacy create', async () => {
    createLegacyCompatibleReturnRequestMock.mockRejectedValueOnce(
      new ServiceError('ORDER_NOT_DELIVERED', 'Only DELIVERED orders can be returned', 400),
    );

    const req: any = {
      params: { id: '12' },
      body: {
        reason: 'Wrong item received',
        proofImages: [],
      },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(requestReturnMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'ORDER_NOT_DELIVERED',
    });
  });

  it('returns INVALID_PROOF_IMAGES when proofImages is not an array', async () => {
    const req: any = {
      params: { id: '12' },
      body: {
        reason: 'Wrong item received',
        proofImages: 'https://example.com/proof-1.jpg',
      },
      user: { userId: 5, roles: ['Customer'] },
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_PROOF_IMAGES',
    });
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it('returns UNAUTHORIZED when posting a return request without an authenticated user', async () => {
    const req: any = {
      params: { id: '12' },
      body: {
        reason: 'Wrong item received',
        proofImages: [],
      },
      user: undefined,
    };
    const res = createResponse();

    await postReturnRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'UNAUTHORIZED',
    });
    expect(requestReturnMock).not.toHaveBeenCalled();
  });

  it('maps ReturnError when processing a return action fails', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    approveReturnRequestMock.mockResolvedValueOnce({
      returnRequestId: 22,
      orderId: 220,
    });

    const req: any = {
      params: { id: '22' },
      body: { action: 'APPROVE' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(processReturnMock).toHaveBeenCalledWith(22, 9, 'APPROVE', undefined);
    expect(approveReturnRequestMock).toHaveBeenCalledWith(22, 9);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'RETURN_APPROVED',
    });
  });

  it('falls back to return-request reject when legacy processing misses the return id', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    rejectReturnRequestMock.mockResolvedValueOnce({
      returnRequestId: 23,
      orderId: 230,
    });

    const req: any = {
      params: { id: '23' },
      body: { action: 'REJECT', note: 'Out of policy' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(rejectReturnRequestMock).toHaveBeenCalledWith(23, 9, 'Out of policy');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'RETURN_REJECTED',
    });
  });

  it('falls back to sequenced return-request refund flow when legacy completion misses the return id', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    getReturnDetailMock.mockResolvedValueOnce({
      returnRequestId: 24,
      status: 'REQUESTED',
    });
    approveReturnRequestMock.mockResolvedValueOnce({
      returnRequestId: 24,
      orderId: 240,
    });
    markReturnReceivedMock.mockResolvedValueOnce({
      returnRequestId: 24,
      orderId: 240,
    });
    refundReturnRequestMock.mockResolvedValueOnce({
      refundTransactionId: 1,
    });

    const req: any = {
      params: { id: '24' },
      body: { action: 'COMPLETE_REFUND', note: 'Refunded in fallback flow' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(getReturnDetailMock).toHaveBeenCalledWith(24);
    expect(approveReturnRequestMock).toHaveBeenCalledWith(24, 9);
    expect(markReturnReceivedMock).toHaveBeenCalledWith(24, 9);
    expect(refundReturnRequestMock).toHaveBeenCalledWith(24, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-24',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'REFUND_COMPLETED',
    });
  });

  it('skips re-approval and only marks received before refund when fallback detail is already approved', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    getReturnDetailMock.mockResolvedValueOnce({
      returnRequestId: 25,
      status: 'APPROVED',
    });
    markReturnReceivedMock.mockResolvedValueOnce({
      returnRequestId: 25,
      orderId: 250,
    });
    refundReturnRequestMock.mockResolvedValueOnce({
      refundTransactionId: 2,
    });

    const req: any = {
      params: { id: '25' },
      body: { action: 'COMPLETE_REFUND', note: 'Refund approved return' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(getReturnDetailMock).toHaveBeenCalledWith(25);
    expect(approveReturnRequestMock).not.toHaveBeenCalled();
    expect(markReturnReceivedMock).toHaveBeenCalledWith(25, 9);
    expect(refundReturnRequestMock).toHaveBeenCalledWith(25, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-25',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'REFUND_COMPLETED',
    });
  });

  it('refunds directly when fallback detail is already received', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    getReturnDetailMock.mockResolvedValueOnce({
      returnRequestId: 26,
      status: 'RECEIVED',
    });
    refundReturnRequestMock.mockResolvedValueOnce({
      refundTransactionId: 3,
    });

    const req: any = {
      params: { id: '26' },
      body: { action: 'COMPLETE_REFUND', note: 'Refund received return' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(getReturnDetailMock).toHaveBeenCalledWith(26);
    expect(approveReturnRequestMock).not.toHaveBeenCalled();
    expect(markReturnReceivedMock).not.toHaveBeenCalled();
    expect(refundReturnRequestMock).toHaveBeenCalledWith(26, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-26',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'REFUND_COMPLETED',
    });
  });

  it('returns ServiceError envelopes when fallback approve fails', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    approveReturnRequestMock.mockRejectedValueOnce(
      new ServiceError('INVALID_STATE_TRANSITION', 'Cannot transition from REJECTED to APPROVED', 400),
    );

    const req: any = {
      params: { id: '27' },
      body: { action: 'APPROVE' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(approveReturnRequestMock).toHaveBeenCalledWith(27, 9);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_STATE_TRANSITION',
    });
  });

  it('returns RETURN_REQUEST_NOT_FOUND when refund fallback detail lookup misses', async () => {
    processReturnMock.mockRejectedValueOnce(new ReturnError('RETURN_NOT_FOUND', 404));
    getReturnDetailMock.mockResolvedValueOnce(null);

    const req: any = {
      params: { id: '28' },
      body: { action: 'COMPLETE_REFUND' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await patchProcessReturn(req, res);

    expect(getReturnDetailMock).toHaveBeenCalledWith(28);
    expect(refundReturnRequestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'RETURN_REQUEST_NOT_FOUND',
    });
  });

  it('blocks non-admin users from the admin returns list', async () => {
    const req: any = {
      query: {},
      user: { userId: 4, roles: ['Customer'] },
    };
    const res = createResponse();

    await getAdminReturns(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'ADMIN_REQUIRED',
    });
    expect(listReturnsMock).not.toHaveBeenCalled();
  });

  it('forwards pagination and status filters to listReturns for admin users', async () => {
    listReturnsMock.mockResolvedValueOnce({
      returns: [{ returnId: 1 }],
      pagination: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    });

    const req: any = {
      query: { page: '2', pageSize: '5', status: 'PENDING_APPROVAL' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await getAdminReturns(req, res);

    expect(listReturnsMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      status: 'PENDING_APPROVAL',
    });
    expect(getAdminReturnRequestsMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      returns: [{ returnId: 1 }],
      pagination: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    });
  });

  it('falls back to return-request admin list when the legacy admin list is empty', async () => {
    listReturnsMock.mockResolvedValueOnce({
      returns: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    getAdminReturnRequestsMock.mockResolvedValueOnce({
      data: [
        {
          returnRequestId: 201,
          orderId: 501,
          userId: 9,
          reason: 'DEFECTIVE',
          status: 'REQUESTED',
          note: 'Need admin review',
          createdAt: '2026-03-20T09:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z',
          attachments: [{ fileUrl: 'https://example.com/proof-201.jpg' }],
          order: {
            orderNumber: 'ORD-501',
            totalAmount: '320000',
            customerName: 'Nguyen Van B',
            customerPhone: '0911111111',
          },
          user: {
            userId: 9,
            fullName: 'Nguyen Van B',
            email: 'customer2@example.com',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const req: any = {
      query: { status: 'ALL' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await getAdminReturns(req, res);

    expect(listReturnsMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'ALL',
    });
    expect(getAdminReturnRequestsMock).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      returns: [
        {
          returnId: 201,
          orderId: 501,
          userId: 9,
          reason: 'DEFECTIVE',
          proofImages: ['https://example.com/proof-201.jpg'],
          status: 'REQUESTED',
          adminNote: 'Need admin review',
          createdAt: '2026-03-20T09:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z',
          order: {
            orderNumber: 'ORD-501',
            totalAmount: '320000',
            customerName: 'Nguyen Van B',
            customerPhone: '0911111111',
          },
          user: {
            userId: 9,
            fullName: 'Nguyen Van B',
            email: 'customer2@example.com',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });

  it('forwards explicit admin status filters to return-request fallback when legacy data is empty', async () => {
    listReturnsMock.mockResolvedValueOnce({
      returns: [],
      pagination: { page: 3, pageSize: 10, total: 0, totalPages: 0 },
    });
    getAdminReturnRequestsMock.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 3,
      limit: 10,
      totalPages: 0,
    });

    const req: any = {
      query: { page: '3', pageSize: '10', status: 'REQUESTED' },
      user: { userId: 9, roles: ['Admin'] },
    };
    const res = createResponse();

    await getAdminReturns(req, res);

    expect(listReturnsMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 10,
      status: 'REQUESTED',
    });
    expect(getAdminReturnRequestsMock).toHaveBeenCalledWith({
      page: 3,
      limit: 10,
      status: 'REQUESTED',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      returns: [],
      pagination: { page: 3, pageSize: 10, total: 0, totalPages: 0 },
    });
  });

  it('returns INVALID_ORDER_ID when getOrderReturn receives a bad id', async () => {
    const req: any = {
      params: { id: 'abc' },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_ORDER_ID',
    });
    expect(getReturnForOrderMock).not.toHaveBeenCalled();
  });

  it('returns success payload when getOrderReturn finds a legacy return record', async () => {
    getReturnForOrderMock.mockResolvedValueOnce({
      returnId: 55,
      orderId: 55,
      status: 'APPROVED',
      proofImages: ['https://example.com/proof-55.jpg'],
    });

    const req: any = {
      params: { id: '55' },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(getReturnForOrderMock).toHaveBeenCalledWith(55);
    expect(getReturnDetailByOrderIdMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnId: 55,
        orderId: 55,
        status: 'APPROVED',
        proofImages: ['https://example.com/proof-55.jpg'],
      },
    });
  });

  it('falls back to return-request detail lookup when no legacy return exists for the order', async () => {
    getReturnForOrderMock.mockResolvedValueOnce(null);
    getReturnDetailByOrderIdMock.mockResolvedValueOnce({
      returnRequestId: 56,
      orderId: 56,
      userId: 8,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      note: 'Original note',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-56.jpg' }],
      statusLogs: [
        { comment: 'Customer created return request' },
        { comment: 'Support reviewed evidence' },
      ],
      order: {
        orderNumber: 'ORD-56',
        totalAmount: '120000',
        customerName: 'Nguyen Van A',
        customerPhone: '0900000000',
      },
      user: {
        userId: 8,
        fullName: 'Nguyen Van A',
        email: 'customer@example.com',
        avatarUrl: null,
      },
    });

    const req: any = {
      params: { id: '56' },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(getReturnForOrderMock).toHaveBeenCalledWith(56);
    expect(getReturnDetailByOrderIdMock).toHaveBeenCalledWith(56);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        returnId: 56,
        orderId: 56,
        userId: 8,
        reason: 'WRONG_ITEM',
        proofImages: ['https://example.com/proof-56.jpg'],
        status: 'REQUESTED',
        adminNote: 'Support reviewed evidence',
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        order: {
          orderNumber: 'ORD-56',
          totalAmount: '120000',
          customerName: 'Nguyen Van A',
          customerPhone: '0900000000',
        },
        user: {
          userId: 8,
          fullName: 'Nguyen Van A',
          email: 'customer@example.com',
          avatarUrl: null,
        },
      },
    });
  });

  it('returns success payload with null data when both legacy and return-request reads miss', async () => {
    getReturnForOrderMock.mockResolvedValueOnce(null);
    getReturnDetailByOrderIdMock.mockResolvedValueOnce(null);

    const req: any = {
      params: { id: '57' },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(getReturnForOrderMock).toHaveBeenCalledWith(57);
    expect(getReturnDetailByOrderIdMock).toHaveBeenCalledWith(57);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: null,
    });
  });

  it('logs and returns INTERNAL_SERVER_ERROR for unexpected getOrderReturn failures', async () => {
    const error = new Error('query crashed');
    getReturnForOrderMock.mockRejectedValueOnce(error);

    const req: any = {
      params: { id: '55' },
    };
    const res = createResponse();

    await getOrderReturn(req, res);

    expect(loggerMock.error).toHaveBeenCalledWith('[returnController] Unexpected error', {
      error,
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });
});
