const prismaMock: any = {
  $transaction: jest.fn(),
  returnRequest: {},
  returnRequestStatusLog: {},
  refundTransaction: {},
  returnRequestAttachment: {},
  customerBankAccount: {},
  refundBankSnapshot: {},
  refundPayoutProof: {},
  refundBenefit: {},
  coupon: {},
};

const repoMock = {
  findOrderForReturn: jest.fn(),
  findActiveByOrderId: jest.fn(),
  getAlreadyReturnedQtyByOrderItem: jest.fn(),
  createReturnRequest: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  findByOrderId: jest.fn(),
  findAllAdmin: jest.fn(),
  countAllAdminStatuses: jest.fn(),
};

const notifyCustomerMock = jest.fn();
const enqueueRefundAcceptedBankInfoRequiredEmailMock = jest.fn().mockResolvedValue(undefined);
const enqueueRefundAcceptedAwaitingPayoutEmailMock = jest.fn().mockResolvedValue(undefined);
const enqueueRefundCompletedBenefitIssuedEmailMock = jest.fn().mockResolvedValue(undefined);
const uploadBase64Mock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../repositories/request.repository', () => ({
  ReturnRequestRepository: jest.fn().mockImplementation(() => repoMock),
}));

jest.mock('../../../utils/notification.util', () => ({
  notifyCustomer: (...args: unknown[]) => notifyCustomerMock(...args),
}));

jest.mock('../../notifications/notification.service', () => ({
  notificationService: {
    enqueueRefundAcceptedBankInfoRequiredEmail: (...args: unknown[]) =>
      enqueueRefundAcceptedBankInfoRequiredEmailMock(...args),
    enqueueRefundAcceptedAwaitingPayoutEmail: (...args: unknown[]) =>
      enqueueRefundAcceptedAwaitingPayoutEmailMock(...args),
    enqueueRefundCompletedBenefitIssuedEmail: (...args: unknown[]) =>
      enqueueRefundCompletedBenefitIssuedEmailMock(...args),
  },
}));

jest.mock('../../../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadBase64: (...args: unknown[]) => uploadBase64Mock(...args),
  },
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
    debug: jest.fn(),
  },
}));

import { Prisma } from '../../../generated/client';
import { ReturnRequestService, ServiceError } from '../services/request.service';

describe('ReturnRequestService', () => {
  const service = new ReturnRequestService();
  const adminWorkflowActor = (actorId = 88) => ({
    actorId,
    rawRoles: ['admin'],
    businessRole: 'admin' as const,
    canManageReturnWorkflow: true,
    canManageRefundWorkflow: true,
  });
  const staffWorkflowActor = (actorId = 90) => ({
    actorId,
    rawRoles: ['support'],
    businessRole: 'staff' as const,
    canManageReturnWorkflow: true,
    canManageRefundWorkflow: false,
  });
  const customerWorkflowActor = (actorId = 5) => ({
    actorId,
    rawRoles: ['customer'],
    businessRole: 'customer' as const,
    canManageReturnWorkflow: false,
    canManageRefundWorkflow: false,
  });
  const createTransitionTx = (currentStatus = 'REQUESTED', orderId = 12, userId = 5) => ({
    returnRequest: {
      findUnique: jest.fn().mockResolvedValue({
        returnRequestId: 50,
        orderId,
        userId,
        status: currentStatus,
      }),
      update: jest.fn().mockImplementation(({ data }: { data: { status: string } }) =>
        Promise.resolve({
          returnRequestId: 50,
          orderId,
          userId,
          status: data.status,
        })),
    },
    customerBankAccount: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    returnRequestStatusLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  });
  const withReturnRequestClaim = <T extends Record<string, any>>(tx: T, count = 1) => {
    tx.returnRequest.updateMany = jest.fn().mockResolvedValue({ count });
    return tx;
  };

  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    repoMock.findOrderForReturn.mockReset();
    repoMock.findActiveByOrderId.mockReset();
    repoMock.getAlreadyReturnedQtyByOrderItem.mockReset();
    repoMock.createReturnRequest.mockReset();
    repoMock.findByUser.mockReset();
    repoMock.findById.mockReset();
    repoMock.findByOrderId.mockReset();
    repoMock.findAllAdmin.mockReset();
    repoMock.countAllAdminStatuses.mockReset();
    notifyCustomerMock.mockReset();
    enqueueRefundAcceptedBankInfoRequiredEmailMock.mockReset().mockResolvedValue(undefined);
    enqueueRefundAcceptedAwaitingPayoutEmailMock.mockReset().mockResolvedValue(undefined);
    enqueueRefundCompletedBenefitIssuedEmailMock.mockReset().mockResolvedValue(undefined);
    uploadBase64Mock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    loggerErrorMock.mockReset();
    prismaMock.returnRequest = {};
    prismaMock.returnRequestStatusLog = {};
    prismaMock.refundTransaction = {};
    prismaMock.returnRequestAttachment = {};
    prismaMock.customerBankAccount = {};
    prismaMock.refundBankSnapshot = {};
    prismaMock.refundPayoutProof = {};
    prismaMock.refundBenefit = {};
    prismaMock.coupon = {};
  });

  it('throws ORDER_NOT_FOUND when the order does not exist', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce(null);

    await expect(
      service.createReturnRequest(5, {
        orderId: 99,
        reason: 'OTHER',
        items: [{ orderItemId: 10, quantity: 1, reason: 'OTHER' }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
  });

  it('throws ORDER_NOT_DELIVERED when the order is not yet delivered', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 5,
      status: 'Processing',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      items: [],
      statusHistory: [],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1, reason: 'DEFECTIVE' }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_DELIVERED',
      status: 400,
    });
  });

  it('throws FORBIDDEN when a user attempts to return another user order', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 999,
      status: 'DELIVERED',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      items: [],
      statusHistory: [],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1, reason: 'DEFECTIVE' }],
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('throws RETURN_WINDOW_EXPIRED when the return deadline has passed', async () => {
    const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{ orderItemId: 12, quantity: 1, unitPrice: 100000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1, reason: 'DEFECTIVE' }],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_WINDOW_EXPIRED',
      status: 400,
    });
  });

  it('throws ORDER_ITEM_NOT_FOUND when a payload item does not belong to the order', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 11,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{
        orderItemId: 18,
        quantity: 1,
        unitPrice: 250000,
        productName: 'Ao hoodie Vintage',
        variantName: 'Trang / S',
      }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await expect(
      service.createReturnRequest(5, {
        orderId: 11,
        reason: 'WRONG_ITEM',
        items: [{ orderItemId: 999, quantity: 1, reason: 'WRONG_ITEM' }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_ITEM_NOT_FOUND',
      status: 400,
    });
  });

  it('throws INVALID_RETURN_QUANTITY when requested quantity exceeds remaining allowance', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 11,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{
        orderItemId: 18,
        quantity: 1,
        unitPrice: 250000,
        productName: 'Ao hoodie Vintage',
        variantName: 'Trang / S',
      }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({ 18: 1 });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await expect(
      service.createReturnRequest(5, {
        orderId: 11,
        reason: 'WRONG_ITEM',
        items: [{ orderItemId: 18, quantity: 1, reason: 'WRONG_ITEM' }],
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_RETURN_QUANTITY',
      status: 400,
      details: {
        orderItemId: 18,
        maxQty: 0,
        productLabel: 'Ao hoodie Vintage - Trang / S',
      },
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('throws RETURN_ALREADY_EXISTS when the order already has an active modern return request', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 11,
      userId: 5,
      status: 'DELIVERED',
      paymentMethod: 'VNPAY',
      payments: [{ status: 'PAID' }],
      createdAt,
      items: [{ orderItemId: 18, quantity: 1, unitPrice: 250000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce({
      returnRequestId: 401,
      orderId: 11,
      status: 'PENDING_ADMIN_REVIEW',
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 11,
        reason: 'WRONG_ITEM',
        items: [{ orderItemId: 18, quantity: 1, reason: 'WRONG_ITEM' }],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_ALREADY_EXISTS',
      status: 409,
      details: {
        returnRequestId: 401,
        orderId: 11,
        workflowStatus: 'PENDING_ADMIN_REVIEW',
      },
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('creates a return request and notifies the customer on success', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 12,
      userId: 5,
      status: 'Đã giao',
      paymentMethod: 'VNPAY',
      payments: [{ status: 'PAID' }],
      createdAt,
      items: [{ orderItemId: 21, quantity: 2, unitPrice: 175000 }],
      statusHistory: [{ status: 'Da Giao', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 44,
      orderId: 12,
      status: 'PENDING_ADMIN_REVIEW',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createReturnRequest(5, {
      orderId: 12,
      reason: 'DEFECTIVE',
      note: 'broken zipper',
      items: [{ orderItemId: 21, quantity: 1, reason: 'DEFECTIVE' }],
      requestAttachments: ['https://example.com/proof-1.jpg'],
      attachments: ['https://example.com/proof-1.jpg'],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'DEFECTIVE',
        note: 'broken zipper',
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
        order: { connect: { orderId: 12 } },
        user: { connect: { userId: 5 } },
        attachments: {
          create: [{ fileUrl: 'https://example.com/proof-1.jpg' }],
        },
        statusLogs: {
          create: expect.objectContaining({
            toStatus: 'PENDING_ADMIN_REVIEW',
            comment: 'Customer created return request. Awaiting admin review',
          }),
        },
      }),
      {},
    );
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toHaveLength(1);
    expect(result).toMatchObject({
      returnRequestId: 44,
      orderId: 12,
      status: 'PENDING_ADMIN_REVIEW',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      refundStatus: 'NOT_APPLICABLE',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REQUESTED', {
      returnRequestId: 44,
      orderId: 12,
    });
  });

  it('derives refund amounts from order-time discount allocation instead of raw unit price', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 13,
      userId: 5,
      status: 'DELIVERED',
      paymentMethod: 'VNPAY',
      payments: [{ status: 'PAID' }],
      discountAmount: new Prisma.Decimal(30000),
      createdAt,
      items: [
        { orderItemId: 31, quantity: 2, unitPrice: 100000 },
        { orderItemId: 32, quantity: 1, unitPrice: 50000 },
      ],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 45,
      orderId: 13,
      status: 'PENDING_ADMIN_REVIEW',
      totalRefundAmount: new Prisma.Decimal(88000),
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await service.createReturnRequest(5, {
      orderId: 13,
      reason: 'DEFECTIVE',
      items: [{ orderItemId: 31, quantity: 1, reason: 'DEFECTIVE' }],
    });

    const createArgs = repoMock.createReturnRequest.mock.calls[0][0];
    expect(createArgs.totalRefundAmount.toString()).toBe('88000');
    expect(createArgs.items.create).toEqual([
      expect.objectContaining({
        quantity: 1,
        unitPrice: new Prisma.Decimal(88000),
      }),
    ]);
  });

  it('prefers persisted order-item net paid snapshot when available', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 14,
      userId: 5,
      status: 'DELIVERED',
      paymentMethod: 'VNPAY',
      payments: [{ status: 'PAID' }],
      discountAmount: new Prisma.Decimal(30000),
      createdAt,
      items: [
        {
          orderItemId: 41,
          quantity: 2,
          unitPrice: 100000,
          netItemPaidAmount: new Prisma.Decimal(170000),
        },
      ],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 46,
      orderId: 14,
      status: 'PENDING_ADMIN_REVIEW',
      totalRefundAmount: new Prisma.Decimal(85000),
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await service.createReturnRequest(5, {
      orderId: 14,
      reason: 'DEFECTIVE',
      items: [{ orderItemId: 41, quantity: 1, reason: 'DEFECTIVE' }],
    });

    const createArgs = repoMock.createReturnRequest.mock.calls[0][0];
    expect(createArgs.totalRefundAmount.toString()).toBe('85000');
    expect(createArgs.items.create).toEqual([
      expect.objectContaining({
        quantity: 1,
        unitPrice: new Prisma.Decimal(85000),
      }),
    ]);
  });

  it('throws RETURN_REQUEST_STORAGE_UNAVAILABLE when create storage delegates are missing', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 12,
      userId: 5,
      status: 'DELIVERED',
      paymentMethod: 'VNPAY',
      payments: [{ status: 'PAID' }],
      createdAt,
      items: [{ orderItemId: 21, quantity: 2, unitPrice: 175000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    prismaMock.returnRequest = undefined;

    await expect(
      service.createReturnRequest(5, {
        orderId: 12,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 21, quantity: 1, reason: 'DEFECTIVE' }],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_REQUEST_STORAGE_UNAVAILABLE',
      status: 503,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('creates COD return requests in PENDING_PAYMENT_CONFIRMATION when collection is not confirmed', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 14,
      userId: 5,
      status: 'Delivered',
      paymentMethod: 'COD',
      payments: [],
      createdAt,
      items: [{ orderItemId: 24, quantity: 1, unitPrice: 99000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 47,
      orderId: 14,
      status: 'PENDING_PAYMENT_CONFIRMATION',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createReturnRequest(5, {
      orderId: 14,
      reason: 'OTHER',
      items: [{ orderItemId: 24, quantity: 1, reason: 'OTHER' }],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        statusLogs: {
          create: expect.objectContaining({
            toStatus: 'PENDING_PAYMENT_CONFIRMATION',
            comment: 'Customer created return request. Awaiting COD payment confirmation',
          }),
        },
      }),
      {},
    );
    expect(result).toMatchObject({
      returnRequestId: 47,
      orderId: 14,
      status: 'PENDING_PAYMENT_CONFIRMATION',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      statusBucket: 'REQUESTED',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
    });
  });

  it('treats drifted settled COD payment aliases as collected when deciding the initial return lock', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 140,
      userId: 5,
      status: 'Delivered',
      paymentMethod: 'COD',
      payments: [{ status: 'success' }],
      createdAt,
      items: [{ orderItemId: 240, quantity: 1, unitPrice: 99000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 470,
      orderId: 140,
      status: 'PENDING_ADMIN_REVIEW',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createReturnRequest(5, {
      orderId: 140,
      reason: 'OTHER',
      items: [{ orderItemId: 240, quantity: 1, reason: 'OTHER' }],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
      {},
    );
    expect(result).toMatchObject({
      returnRequestId: 470,
      orderId: 140,
      status: 'PENDING_ADMIN_REVIEW',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      refundStatus: 'NOT_APPLICABLE',
    });
  });

  it('creates a return request from canonical item-level payload fields after controller normalization', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 13,
      userId: 5,
      status: 'Delivered',
      createdAt,
      items: [{ orderItemId: 22, quantity: 1, unitPrice: 190000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 45,
      orderId: 13,
      status: 'PENDING_ADMIN_REVIEW',
      attachments: [],
      items: [
        {
          returnRequestItemId: 902,
          orderItemId: 22,
          quantity: 1,
          unitPrice: new Prisma.Decimal(190000),
          reason: 'WRONG_ITEM',
        },
      ],
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) =>
      fn({
        returnRequestAttachment: {
          create: jest.fn().mockImplementation(({ data }: { data: { fileUrl: string; returnRequestItem: { connect: { returnRequestItemId: number } } } }) =>
            Promise.resolve({
              attachmentId: 77,
              fileUrl: data.fileUrl,
              returnRequestItemId: data.returnRequestItem.connect.returnRequestItemId,
            })),
        },
      }));

    const result = await service.createReturnRequest(5, {
      orderId: 13,
      reason: 'WRONG_ITEM',
      note: 'please review\nItem 22: received wrong color',
      items: [
        {
          orderItemId: 22,
          quantity: 1,
          reason: 'WRONG_ITEM',
          reasonText: 'received wrong color',
          attachments: ['https://example.com/item-22.jpg'],
        },
      ],
      requestAttachments: [],
      attachments: ['https://example.com/item-22.jpg'],
    } as any);

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'WRONG_ITEM',
        note: 'please review\nItem 22: received wrong color',
        attachments: undefined,
      }),
      expect.objectContaining({
        returnRequestAttachment: expect.objectContaining({
          create: expect.any(Function),
        }),
      }),
    );
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toHaveLength(1);
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0]).toMatchObject({
      orderItem: { connect: { orderItemId: 22 } },
      quantity: 1,
      reason: 'WRONG_ITEM',
      reasonText: 'received wrong color',
    });
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0].unitPrice.toString()).toBe('190000');
    expect(result).toMatchObject({
      returnRequestId: 45,
      orderId: 13,
      status: 'PENDING_ADMIN_REVIEW',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      refundStatus: 'NOT_APPLICABLE',
      refundableCapAmount: new Prisma.Decimal(190000),
      attachments: [
        {
          attachmentId: 77,
          fileUrl: 'https://example.com/item-22.jpg',
          returnRequestItemId: 902,
        },
      ],
      items: [
        {
          returnRequestItemId: 902,
          orderItemId: 22,
          quantity: 1,
          unitPrice: new Prisma.Decimal(190000),
          reason: 'WRONG_ITEM',
          requestedRefundAmount: new Prisma.Decimal(190000),
          orderItemGrossAmount: null,
          orderItemAllocatedDiscountAmount: null,
          orderItemNetPaidAmount: null,
          attachments: [
            {
              attachmentId: 77,
              fileUrl: 'https://example.com/item-22.jpg',
              returnRequestItemId: 902,
            },
          ],
        },
      ],
    });
  });

  it('creates a legacy-compatible return request when the order has a single item', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn
      .mockResolvedValueOnce({
        orderId: 40,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [{ orderItemId: 301, quantity: 1 }],
        statusHistory: [],
      })
      .mockResolvedValueOnce({
        orderId: 40,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [{ orderItemId: 301, quantity: 1, unitPrice: 175000 }],
        statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
      });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 45,
      orderId: 40,
      status: 'PENDING_ADMIN_REVIEW',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createLegacyCompatibleReturnRequest(5, {
      orderId: 40,
      reason: 'Wrong item received from warehouse',
      proofImages: ['https://example.com/proof-40.jpg'],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { connect: { orderId: 40 } },
        user: { connect: { userId: 5 } },
        reason: 'WRONG_ITEM',
        note: 'Wrong item received from warehouse',
      }),
      {},
    );
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toHaveLength(1);
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0]).toMatchObject({
      orderItem: { connect: { orderItemId: 301 } },
      quantity: 1,
      reason: 'WRONG_ITEM',
    });
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0].unitPrice.toString()).toBe('175000');
    expect(result).toMatchObject({
      returnRequestId: 45,
      orderId: 40,
      status: 'PENDING_ADMIN_REVIEW',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      refundStatus: 'NOT_APPLICABLE',
    });
  });

  it('creates a legacy-compatible return request when a multi-item order has exactly one remaining returnable item', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn
      .mockResolvedValueOnce({
        orderId: 41,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [
          { orderItemId: 401, quantity: 1 },
          { orderItemId: 402, quantity: 2 },
        ],
        statusHistory: [],
      })
      .mockResolvedValueOnce({
        orderId: 41,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [
          { orderItemId: 401, quantity: 1, unitPrice: 150000 },
          { orderItemId: 402, quantity: 2, unitPrice: 175000 },
        ],
        statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
      });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem
      .mockResolvedValueOnce({ 401: 1, 402: 1 })
      .mockResolvedValueOnce({ 402: 1 });
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 46,
      orderId: 41,
      status: 'PENDING_ADMIN_REVIEW',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createLegacyCompatibleReturnRequest(5, {
      orderId: 41,
      reason: 'Defective packaging',
      proofImages: ['https://example.com/proof-41.jpg'],
    });

    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toHaveLength(1);
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0]).toMatchObject({
      orderItem: { connect: { orderItemId: 402 } },
      quantity: 1,
      reason: 'DEFECTIVE',
    });
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create[0].unitPrice.toString()).toBe('175000');
    expect(result).toMatchObject({
      returnRequestId: 46,
      orderId: 41,
      status: 'PENDING_ADMIN_REVIEW',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      refundStatus: 'NOT_APPLICABLE',
    });
  });

  it('rejects legacy-compatible create when the order needs explicit item selection', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 41,
      userId: 5,
      status: 'Delivered',
      createdAt: new Date(),
      items: [
        { orderItemId: 401, quantity: 1 },
        { orderItemId: 402, quantity: 1 },
      ],
      statusHistory: [],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);

    await expect(
      service.createLegacyCompatibleReturnRequest(5, {
        orderId: 41,
        reason: 'Defective items',
        proofImages: [],
      }),
    ).rejects.toMatchObject({
      code: 'ITEM_SELECTION_REQUIRED',
      status: 409,
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('rejects legacy-compatible create when no returnable items remain after previous returns', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 42,
      userId: 5,
      status: 'Delivered',
      createdAt: new Date(),
      items: [
        { orderItemId: 501, quantity: 1 },
        { orderItemId: 502, quantity: 2 },
      ],
      statusHistory: [],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce(null);
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({
      501: 1,
      502: 2,
    });

    await expect(
      service.createLegacyCompatibleReturnRequest(5, {
        orderId: 42,
        reason: 'Defective items',
        proofImages: [],
      }),
    ).rejects.toMatchObject({
      code: 'ITEM_SELECTION_REQUIRED',
      status: 409,
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('throws RETURN_ALREADY_EXISTS for legacy-compatible create when the order already has an active modern return request', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 44,
      userId: 5,
      status: 'Delivered',
      createdAt: new Date(),
      items: [{ orderItemId: 601, quantity: 1 }],
      statusHistory: [],
    });
    repoMock.findActiveByOrderId.mockResolvedValueOnce({
      returnRequestId: 402,
      orderId: 44,
      status: 'ACCEPTED_FOR_REFUND',
    });

    await expect(
      service.createLegacyCompatibleReturnRequest(5, {
        orderId: 44,
        reason: 'Wrong item received',
        proofImages: ['https://example.com/proof-44.jpg'],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_ALREADY_EXISTS',
      status: 409,
      details: {
        returnRequestId: 402,
        orderId: 44,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      },
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('approves a return request and notifies the customer', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 50,
      orderId: 700,
      reason: 'WRONG_ITEM',
      status: 'PENDING_ADMIN_REVIEW',
    });
    const tx = createTransitionTx('PENDING_ADMIN_REVIEW', 700);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.approveReturnRequest(50, 88, adminWorkflowActor(88));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 50 },
      data: { status: 'APPROVED', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 50,
        fromStatus: 'PENDING_ADMIN_REVIEW',
        toStatus: 'APPROVED',
        changedBy: 88,
        comment: 'Approved by support/admin',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 700,
      status: 'APPROVED',
      workflowStatus: 'APPROVED',
      statusBucket: 'APPROVED',
      refundStatus: 'NOT_APPLICABLE',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_APPROVED', {
      returnRequestId: 50,
      orderId: 700,
    });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[returnWorkflowAudit]',
      expect.objectContaining({
        action: 'approve_return_request',
        actorUserId: 88,
        actorRawRoles: ['admin'],
        actorBusinessRole: 'admin',
        returnRequestId: 50,
        orderId: 700,
        oldState: 'PENDING_ADMIN_REVIEW',
        newState: 'APPROVED',
        oldRefundStatus: 'NOT_APPLICABLE',
        newRefundStatus: 'NOT_APPLICABLE',
        note: 'Approved by support/admin',
      }),
    );
  });

  it('approves prepaid cancellation requests directly into the refund queue without customer approval notice', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 60,
      orderId: 710,
      reason: 'PRE_DELIVERY_CANCELLATION',
      status: 'PENDING_ADMIN_REVIEW',
    });
    const tx = createTransitionTx('PENDING_ADMIN_REVIEW', 710);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.approveReturnRequest(60, 88, adminWorkflowActor(88));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 60 },
      data: expect.objectContaining({
        status: 'ACCEPTED_FOR_REFUND',
        updatedAt: expect.any(Date),
        refundStatus: 'PENDING',
        bankInfoRequestedAt: expect.any(Date),
      }),
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 60,
        fromStatus: 'PENDING_ADMIN_REVIEW',
        toStatus: 'ACCEPTED_FOR_REFUND',
        changedBy: 88,
        comment: 'Approved for refund queue after prepaid cancellation before fulfillment',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 710,
      status: 'ACCEPTED_FOR_REFUND',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      statusBucket: 'RECEIVED',
      refundStatus: 'PENDING',
    });
    expect(notifyCustomerMock).not.toHaveBeenCalled();
  });

  it('rejects a return request and notifies the customer with the comment', async () => {
    const tx = createTransitionTx('PENDING_ADMIN_REVIEW', 701);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.rejectReturnRequest(
      51,
      89,
      'Out of policy',
      adminWorkflowActor(89),
    );

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 51 },
      data: {
        status: 'REJECTED',
        updatedAt: expect.any(Date),
        refundStatus: 'NOT_APPLICABLE',
      },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 51,
        fromStatus: 'PENDING_ADMIN_REVIEW',
        toStatus: 'REJECTED',
        changedBy: 89,
        comment: 'Out of policy',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 701,
      status: 'REJECTED',
      workflowStatus: 'REJECTED',
      statusBucket: 'REJECTED',
      refundStatus: 'NOT_APPLICABLE',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REJECTED', {
      returnRequestId: 51,
      orderId: 701,
      comment: 'Out of policy',
    });
  });

  it('marks a return request as received and notifies the customer', async () => {
    const tx = createTransitionTx('APPROVED', 702);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.markReturnReceived(52, 90, staffWorkflowActor(90));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 52 },
      data: { status: 'RECEIVED_AND_INSPECTING', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 52,
        fromStatus: 'APPROVED',
        toStatus: 'RECEIVED_AND_INSPECTING',
        changedBy: 90,
        comment: 'Warehouse confirmed return package received and inspection started',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 702,
      status: 'RECEIVED_AND_INSPECTING',
      workflowStatus: 'RECEIVED_AND_INSPECTING',
      statusBucket: 'RECEIVED',
      refundStatus: 'NOT_APPLICABLE',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_RECEIVED', {
      returnRequestId: 52,
      orderId: 702,
    });
  });

  it('marks an approved return request as in transit', async () => {
    const tx = createTransitionTx('APPROVED', 704);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.markReturnInTransit(54, 92, staffWorkflowActor(92));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 54 },
      data: { status: 'IN_RETURN_TRANSIT', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 54,
        fromStatus: 'APPROVED',
        toStatus: 'IN_RETURN_TRANSIT',
        changedBy: 92,
        comment: 'Return package handed off for transit back to warehouse',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 704,
      status: 'IN_RETURN_TRANSIT',
      workflowStatus: 'IN_RETURN_TRANSIT',
      statusBucket: 'APPROVED',
      refundStatus: 'NOT_APPLICABLE',
    });
    expect(notifyCustomerMock).not.toHaveBeenCalled();
  });

  it('accepts an inspected return request for refund', async () => {
    const tx = createTransitionTx('RECEIVED_AND_INSPECTING', 703);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.acceptReturnForRefund(53, 91, staffWorkflowActor(91));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 53 },
      data: expect.objectContaining({
        status: 'ACCEPTED_FOR_REFUND',
        updatedAt: expect.any(Date),
        refundStatus: 'PENDING',
        bankInfoRequestedAt: expect.any(Date),
      }),
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 53,
        fromStatus: 'RECEIVED_AND_INSPECTING',
        toStatus: 'ACCEPTED_FOR_REFUND',
        changedBy: 91,
        comment: 'Return accepted for refund after receive and inspection',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 50,
      orderId: 703,
      status: 'ACCEPTED_FOR_REFUND',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      statusBucket: 'RECEIVED',
      refundStatus: 'PENDING',
    });
    expect(notifyCustomerMock).not.toHaveBeenCalled();
  });

  it('sends the bank-info-required email when a refund is accepted without customer bank info', async () => {
    const tx = {
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 153,
          orderId: 803,
          userId: 17,
          status: 'RECEIVED_AND_INSPECTING',
        }),
        update: jest.fn().mockResolvedValue({
          returnRequestId: 153,
          orderId: 803,
          userId: 17,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
        }),
      },
      customerBankAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 153,
      orderId: 803,
      status: 'ACCEPTED_FOR_REFUND',
      user: {
        email: 'customer@example.com',
        fullName: 'Nguyen Van A',
      },
      order: {
        orderNumber: 'OD-803',
      },
      bankInfo: {
        available: false,
      },
    });

    await service.acceptReturnForRefund(153, 91, staffWorkflowActor(91));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 153 },
      data: expect.objectContaining({
        status: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        bankInfoRequestedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    });
    expect(enqueueRefundAcceptedBankInfoRequiredEmailMock).toHaveBeenCalledWith({
      returnRequestId: 153,
      email: 'customer@example.com',
      customerName: 'Nguyen Van A',
      orderNumber: 'OD-803',
      profileBankLink: expect.stringContaining('/profile'),
    });
    expect(enqueueRefundAcceptedAwaitingPayoutEmailMock).not.toHaveBeenCalled();
  });

  it('sends the awaiting-payout email when a refund is accepted with bank info already available', async () => {
    const tx = {
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 154,
          orderId: 804,
          userId: 18,
          status: 'RECEIVED_AND_INSPECTING',
        }),
        update: jest.fn().mockResolvedValue({
          returnRequestId: 154,
          orderId: 804,
          userId: 18,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
        }),
      },
      customerBankAccount: {
        findFirst: jest.fn().mockResolvedValue({
          bankAccountId: 41,
          userId: 18,
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '123456789',
          accountHolder: 'Tran Thi B',
          qrImageUrl: null,
          inputMethod: 'MANUAL',
          isActive: true,
          isDefault: true,
          updatedAt: new Date('2026-04-03T08:00:00.000Z'),
        }),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 154,
      orderId: 804,
      status: 'ACCEPTED_FOR_REFUND',
      user: {
        email: 'banked@example.com',
        fullName: 'Tran Thi B',
      },
      order: {
        orderNumber: 'OD-804',
      },
      bankInfo: {
        available: true,
      },
    });

    await service.acceptReturnForRefund(154, 91, staffWorkflowActor(91));

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 154 },
      data: expect.objectContaining({
        status: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        bankInfoSubmittedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    });
    expect(enqueueRefundAcceptedAwaitingPayoutEmailMock).toHaveBeenCalledWith({
      returnRequestId: 154,
      email: 'banked@example.com',
      customerName: 'Tran Thi B',
      orderNumber: 'OD-804',
    });
    expect(enqueueRefundAcceptedBankInfoRequiredEmailMock).not.toHaveBeenCalled();
  });

  it('throws INVALID_STATE_TRANSITION when mark-received is called before approval', async () => {
    const tx = createTransitionTx('REQUESTED', 702);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(service.markReturnReceived(52, 90, staffWorkflowActor(90))).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
    });

    expect(tx.returnRequest.update).not.toHaveBeenCalled();
    expect(notifyCustomerMock).not.toHaveBeenCalled();
  });

  it('returns the existing refund transaction when the idempotency key already exists', async () => {
    const existingRefund = {
      refundTransactionId: 90,
      returnRequestId: 12,
      amount: new Prisma.Decimal(150000),
      method: 'WALLET_CREDIT',
      status: 'COMPLETED',
      idempotencyKey: 'dup-key-1234',
      transactionRef: 'RF-12-dup',
    };
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(existingRefund),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 12,
          status: 'CLOSED',
          refundStatus: 'REFUNDED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({ orderId: 12 });

    const result = await service.refundReturnRequest(
      12,
      99,
      {
        method: 'WALLET_CREDIT',
        idempotencyKey: 'dup-key-1234',
      },
      adminWorkflowActor(99),
    );

    expect(result).toBe(existingRefund);
    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('syncs persisted refundStatus to PROCESSING on idempotent replay when existing transaction is still processing', async () => {
    const existingRefund = {
      refundTransactionId: 91,
      returnRequestId: 12,
      amount: new Prisma.Decimal(150000),
      method: 'WALLET_CREDIT',
      status: 'PROCESSING',
      idempotencyKey: 'dup-key-processing',
      transactionRef: 'RF-12-processing',
    };
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(existingRefund),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 12,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.refundReturnRequest(
      12,
      99,
      {
        method: 'WALLET_CREDIT',
        idempotencyKey: 'dup-key-processing',
      },
      adminWorkflowActor(99),
    );

    expect(result).toBe(existingRefund);
    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 12 },
      data: { refundStatus: 'PROCESSING' },
    });
    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
  });

  it('syncs persisted refundStatus to REFUNDED on idempotent replay when completed amount matches the item snapshot cap', async () => {
    const existingRefund = {
      refundTransactionId: 92,
      returnRequestId: 13,
      amount: new Prisma.Decimal(80000),
      method: 'WALLET_CREDIT',
      status: 'COMPLETED',
      idempotencyKey: 'dup-key-snapshot-complete',
      transactionRef: 'RF-13-complete',
    };
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(existingRefund),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 13,
          status: 'CLOSED',
          refundStatus: 'PENDING',
          totalRefundAmount: new Prisma.Decimal(150000),
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(80000) }],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.refundReturnRequest(
      13,
      99,
      {
        method: 'WALLET_CREDIT',
        idempotencyKey: 'dup-key-snapshot-complete',
      },
      adminWorkflowActor(99),
    );

    expect(result).toBe(existingRefund);
    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 13 },
      data: { refundStatus: 'REFUNDED' },
    });
    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
  });

  it('throws INVALID_REFUND_AMOUNT when refund amount exceeds the allowed total', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 50,
          status: 'RECEIVED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(
        50,
        99,
        {
          method: 'ORIGINAL_PAYMENT',
          amount: 200000,
          idempotencyKey: 'refund-key-200000',
        },
        adminWorkflowActor(99),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_REFUND_AMOUNT',
      status: 400,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws INVALID_REFUND_AMOUNT when persisted item snapshot is lower than the legacy request total', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 51,
          status: 'ACCEPTED_FOR_REFUND',
          totalRefundAmount: new Prisma.Decimal(150000),
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(80000) }],
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(
        51,
        99,
        {
          method: 'ORIGINAL_PAYMENT',
          amount: 90000,
          idempotencyKey: 'refund-key-snapshot-cap',
        },
        adminWorkflowActor(99),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_REFUND_AMOUNT',
      status: 400,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws RETURN_REQUEST_NOT_FOUND when refund target does not exist', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(
        404,
        99,
        {
          method: 'ORIGINAL_PAYMENT',
          idempotencyKey: 'refund-key-missing',
        },
        adminWorkflowActor(99),
      ),
    ).rejects.toMatchObject({
      code: 'RETURN_REQUEST_NOT_FOUND',
      status: 404,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws INVALID_STATE_TRANSITION when refund is attempted before the return is received', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 50,
          status: 'REQUESTED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(
        50,
        99,
        {
          method: 'ORIGINAL_PAYMENT',
          idempotencyKey: 'refund-key-requested',
        },
        adminWorkflowActor(99),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('creates a refund transaction, updates status, and notifies the customer', async () => {
    const tx = withReturnRequestClaim({
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          refundTransactionId: 101,
          amount: new Prisma.Decimal(150000),
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          idempotencyKey: 'refund-key-1234',
          transactionRef: 'RF-55-101',
        }),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 55,
          orderId: 700,
          status: 'ACCEPTED_FOR_REFUND',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({ orderId: 700 });

    const result = await service.refundReturnRequest(
      55,
      88,
      {
        method: 'ORIGINAL_PAYMENT',
        amount: 150000,
        idempotencyKey: 'refund-key-1234',
      },
      adminWorkflowActor(88),
    );

    expect(tx.refundTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 55,
        method: 'ORIGINAL_PAYMENT',
        status: 'COMPLETED',
        idempotencyKey: 'refund-key-1234',
        processedBy: 88,
      }),
    });
    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 55 },
      data: { status: 'CLOSED', refundStatus: 'REFUNDED' },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 55,
        fromStatus: 'ACCEPTED_FOR_REFUND',
        toStatus: 'CLOSED',
        changedBy: 88,
      }),
    });
    expect(result).toMatchObject({
      refundTransactionId: 101,
      method: 'ORIGINAL_PAYMENT',
      status: 'COMPLETED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REFUNDED', {
      returnRequestId: 55,
      orderId: 700,
      refundAmount: 150000,
      refundMethod: 'ORIGINAL_PAYMENT',
    });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[returnWorkflowAudit]',
      expect.objectContaining({
        action: 'execute_refund',
        actorUserId: 88,
        actorRawRoles: ['admin'],
        actorBusinessRole: 'admin',
        returnRequestId: 55,
        orderId: 700,
        oldState: 'ACCEPTED_FOR_REFUND',
        newState: 'CLOSED',
        oldRefundStatus: 'PENDING',
        newRefundStatus: 'REFUNDED',
        idempotencyKey: expect.stringContaining('***'),
        externalRefundReference: expect.stringContaining('***'),
      }),
    );
  });

  it('marks refund as fully refunded when amount matches the persisted item snapshot cap', async () => {
    const tx = withReturnRequestClaim({
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          refundTransactionId: 102,
          amount: new Prisma.Decimal(80000),
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          idempotencyKey: 'refund-key-snapshot-full',
          transactionRef: 'RF-56-102',
        }),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 56,
          orderId: 701,
          status: 'ACCEPTED_FOR_REFUND',
          totalRefundAmount: new Prisma.Decimal(150000),
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(80000) }],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({ orderId: 701 });

    await service.refundReturnRequest(
      56,
      88,
      {
        method: 'ORIGINAL_PAYMENT',
        amount: 80000,
        idempotencyKey: 'refund-key-snapshot-full',
      },
      adminWorkflowActor(88),
    );

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 56 },
      data: { status: 'CLOSED', refundStatus: 'REFUNDED' },
    });
  });

  it('returns CONFLICT when a simultaneous operator claims the refund execution first', async () => {
    const tx = withReturnRequestClaim({
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 75,
          orderId: 715,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          totalRefundAmount: new Prisma.Decimal(150000),
          updatedAt: new Date('2026-04-05T08:00:00.000Z'),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    }, 0);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(
        75,
        88,
        {
          method: 'ORIGINAL_PAYMENT',
          amount: 150000,
          idempotencyKey: 'refund-key-conflict-75',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      details: { reason: 'refund_execution_conflict' },
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws RETURN_REQUEST_STORAGE_UNAVAILABLE when refund delegates are missing', async () => {
    prismaMock.refundTransaction = undefined;

    await expect(
      service.refundReturnRequest(
        55,
        88,
        {
          method: 'ORIGINAL_PAYMENT',
          amount: 150000,
          idempotencyKey: 'refund-key-missing-storage',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'RETURN_REQUEST_STORAGE_UNAVAILABLE',
      status: 503,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects manual bank refund completion when no bank account is available', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 180,
          orderId: 880,
          userId: 28,
          status: 'ACCEPTED_FOR_REFUND',
          refundCompletedAt: null,
          totalRefundAmount: new Prisma.Decimal(150000),
          order: {
            orderId: 880,
            orderNumber: 'OD-880',
            shippingFee: new Prisma.Decimal(30000),
          },
          user: {
            userId: 28,
            fullName: 'Customer Missing Bank',
            email: 'missing-bank@example.com',
          },
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(150000) }],
          refundTransactions: [],
        }),
      },
      customerBankAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.completeManualBankRefund(
        180,
        501,
        {
          amount: 150000,
          proofImageUrls: ['https://cdn.example.com/refund-proof.jpg'],
        },
        adminWorkflowActor(501),
      ),
    ).rejects.toMatchObject({
      code: 'BANK_INFO_REQUIRED',
      status: 409,
    });
  });

  it('completes manual bank refund with snapshot, proofs, benefit issuance, hidden coupon, and success email', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 181,
          orderId: 881,
          userId: 29,
          status: 'ACCEPTED_FOR_REFUND',
          refundCompletedAt: null,
          totalRefundAmount: new Prisma.Decimal(150000),
          order: {
            orderId: 881,
            orderNumber: 'OD-881',
            shippingFee: new Prisma.Decimal(30000),
          },
          user: {
            userId: 29,
            fullName: 'Refunded Customer',
            email: 'refunded@example.com',
          },
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(150000) }],
          refundTransactions: [],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      customerBankAccount: {
        findFirst: jest.fn().mockResolvedValue({
          bankAccountId: 77,
          userId: 29,
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '123456789',
          accountHolder: 'Refunded Customer',
          qrImageUrl: 'https://cdn.example.com/bank-qr.png',
          inputMethod: 'QR_IMAGE',
          isActive: true,
          isDefault: true,
          updatedAt: new Date('2026-04-03T08:00:00.000Z'),
        }),
      },
      refundBankSnapshot: {
        create: jest.fn().mockResolvedValue({ refundBankSnapshotId: 901 }),
      },
      refundTransaction: {
        create: jest.fn().mockResolvedValue({
          refundTransactionId: 902,
          amount: new Prisma.Decimal(150000),
          method: 'BANK_TRANSFER',
          status: 'COMPLETED',
          transactionRef: 'VCB-181',
        }),
      },
      refundPayoutProof: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      refundBenefit: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          refundBenefitId: 903,
          benefitType: 'FREESHIP',
        }),
      },
      coupon: {
        create: jest.fn().mockResolvedValue({
          couponId: 904,
        }),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.completeManualBankRefund(
      181,
      501,
      {
        amount: 150000,
        transactionRef: 'VCB-181',
        financeNote: '  Da chuyen khoan hoan tien  ',
        selectedBankAccountId: 77,
        proofImageUrls: [
          'https://cdn.example.com/proofs/refund-1.png',
          'https://cdn.example.com/proofs/refund-2.jpg',
        ],
      },
      adminWorkflowActor(501),
    );

    expect(tx.refundBankSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 181,
        bankAccountId: 77,
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumberMasked: '****6789',
        accountHolder: 'Refunded Customer',
        qrImageUrl: 'https://cdn.example.com/bank-qr.png',
        inputMethod: 'QR_IMAGE',
        capturedAt: expect.any(Date),
      }),
    });
    expect(tx.refundTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 181,
        amount: new Prisma.Decimal(150000),
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        idempotencyKey: 'bank-refund-181',
        transactionRef: 'VCB-181',
        processedBy: 501,
      }),
    });
    expect(tx.refundPayoutProof.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 181,
          refundTransactionId: 902,
          uploadedBy: 501,
          fileUrl: 'https://cdn.example.com/proofs/refund-1.png',
          fileName: 'refund-1.png',
          mimeType: 'image/png',
          note: 'Da chuyen khoan hoan tien',
        }),
        expect.objectContaining({
          returnRequestId: 181,
          refundTransactionId: 902,
          uploadedBy: 501,
          fileUrl: 'https://cdn.example.com/proofs/refund-2.jpg',
          fileName: 'refund-2.jpg',
          mimeType: 'image/jpeg',
          note: null,
        }),
      ],
    });
    expect(tx.coupon.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: expect.stringMatching(/^RFB-181-/),
        isHidden: true,
        source: 'REFUND_BENEFIT',
        visibleInPublicList: false,
        usageLimit: 1,
        usagePerUser: 1,
      }),
    });
    expect(tx.refundBenefit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 181,
        orderId: 881,
        userId: 29,
        benefitType: 'FREESHIP',
        status: 'ACTIVE',
        source: 'REFUND',
        couponId: 904,
      }),
    });
    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 181 },
      data: expect.objectContaining({
        status: 'CLOSED',
        refundStatus: 'REFUNDED',
        financeNote: 'Da chuyen khoan hoan tien',
        refundCompletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REFUNDED', {
      returnRequestId: 181,
      orderId: 881,
      refundAmount: 150000,
      refundMethod: 'BANK_TRANSFER',
      customerEmail: 'refunded@example.com',
      customerName: 'Refunded Customer',
    });
    expect(enqueueRefundCompletedBenefitIssuedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        returnRequestId: 181,
        email: 'refunded@example.com',
        customerName: 'Refunded Customer',
        orderNumber: 'OD-881',
        refundAmount: 150000,
        refundDate: expect.any(String),
        voucherSummary: 'Miễn phí vận chuyển cho đơn từ 300.000đ',
        profileLink: expect.stringContaining('/profile'),
      }),
    );
    expect(result).toMatchObject({
      refundTransactionId: 902,
      refundStatus: 'REFUNDED',
      benefit: {
        issued: true,
        type: 'FREESHIP',
        summary: 'Miễn phí vận chuyển cho đơn từ 300.000đ',
      },
    });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[returnWorkflowAudit]',
      expect.objectContaining({
        action: 'complete_bank_refund',
        actorUserId: 501,
        actorRawRoles: ['admin'],
        actorBusinessRole: 'admin',
        returnRequestId: 181,
        orderId: 881,
        oldState: 'ACCEPTED_FOR_REFUND',
        newState: 'CLOSED',
        oldRefundStatus: 'PENDING',
        newRefundStatus: 'REFUNDED',
        note: 'Da chuyen khoan hoan tien',
        idempotencyKey: expect.stringContaining('***'),
        externalRefundReference: expect.stringContaining('***'),
        metadata: {
          proofImageCount: 2,
          benefitIssued: true,
        },
      }),
    );
  });

  it('returns CONFLICT when another operator completes the manual bank refund first', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 182,
          orderId: 882,
          userId: 30,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          refundCompletedAt: null,
          updatedAt: new Date('2026-04-05T08:00:00.000Z'),
          totalRefundAmount: new Prisma.Decimal(150000),
          order: {
            orderId: 882,
            orderNumber: 'OD-882',
            shippingFee: new Prisma.Decimal(30000),
          },
          user: {
            userId: 30,
            fullName: 'Concurrent Customer',
            email: 'concurrent@example.com',
          },
          items: [{ quantity: 1, unitPrice: new Prisma.Decimal(150000) }],
          refundTransactions: [],
        }),
        update: jest.fn(),
      },
      customerBankAccount: {
        findFirst: jest.fn().mockResolvedValue({
          bankAccountId: 78,
          bankName: 'Vietcombank',
          bankCode: 'VCB',
          accountNumber: '123456789',
          accountHolder: 'Concurrent Customer',
          qrImageUrl: null,
          inputMethod: 'MANUAL',
          isActive: true,
          isDefault: true,
          updatedAt: new Date('2026-04-03T08:00:00.000Z'),
        }),
      },
      refundBankSnapshot: {
        create: jest.fn(),
      },
      refundTransaction: {
        create: jest.fn(),
      },
      refundPayoutProof: {
        createMany: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
      refundBenefit: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      coupon: {
        create: jest.fn(),
      },
    }, 0);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.completeManualBankRefund(
        182,
        501,
        {
          amount: 150000,
          transactionRef: 'VCB-182',
          proofImageUrls: ['https://cdn.example.com/proofs/refund-182.png'],
        },
        adminWorkflowActor(501),
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      details: { reason: 'complete_bank_refund_conflict' },
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.refundPayoutProof.createMany).not.toHaveBeenCalled();
  });

  it('updates refundStatus for finance review checkpoints on accepted returns', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 56,
          orderId: 710,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          financeNote: null,
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue({
          returnRequestId: 56,
          orderId: 710,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING',
          financeNote: null,
        }),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.updateRefundStatus(
      56,
      88,
      {
        refundStatus: 'PROCESSING',
      },
      adminWorkflowActor(88),
    );

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 56 },
      data: {
        refundStatus: 'PROCESSING',
        financeNote: null,
        updatedAt: expect.any(Date),
      },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 56,
        fromStatus: 'ACCEPTED_FOR_REFUND',
        toStatus: 'ACCEPTED_FOR_REFUND',
        changedBy: 88,
        comment: 'Refund status updated: PENDING -> PROCESSING',
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 56,
      orderId: 710,
      status: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PROCESSING',
      financeNoteUpdatedAt: null,
      financeNoteUpdatedBy: null,
      workflowStatus: 'ACCEPTED_FOR_REFUND',
    });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[returnWorkflowAudit]',
      expect.objectContaining({
        action: 'update_refund_status',
        actorUserId: 88,
        actorRawRoles: ['admin'],
        actorBusinessRole: 'admin',
        returnRequestId: 56,
        orderId: 710,
        oldState: 'ACCEPTED_FOR_REFUND',
        newState: 'ACCEPTED_FOR_REFUND',
        oldRefundStatus: 'PENDING',
        newRefundStatus: 'PROCESSING',
        note: 'Refund status updated: PENDING -> PROCESSING',
      }),
    );
  });

  it('persists financeNote for failed refund checkpoints', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 60,
          orderId: 711,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING',
          financeNote: null,
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue({
          returnRequestId: 60,
          orderId: 711,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'FAILED',
          financeNote: 'Gateway timeout while issuing refund',
        }),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.updateRefundStatus(
      60,
      88,
      {
        refundStatus: 'FAILED',
        comment: '  Gateway timeout while issuing refund  ',
      },
      adminWorkflowActor(88),
    );

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 60 },
      data: {
        refundStatus: 'FAILED',
        financeNote: 'Gateway timeout while issuing refund',
        updatedAt: expect.any(Date),
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 60,
      refundStatus: 'FAILED',
      financeNote: 'Gateway timeout while issuing refund',
      financeNoteUpdatedBy: {
        userId: 88,
      },
    });
    expect(result).toMatchObject(
      expect.objectContaining({
        financeNoteUpdatedAt: expect.any(Date),
      }),
    );
  });

  it('clears financeNote when refund returns to processing', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 61,
          orderId: 712,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'FAILED',
          financeNote: 'Need finance intervention',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue({
          returnRequestId: 61,
          orderId: 712,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING',
          financeNote: null,
        }),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.updateRefundStatus(
      61,
      88,
      {
        refundStatus: 'PROCESSING',
      },
      adminWorkflowActor(88),
    );

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 61 },
      data: {
        refundStatus: 'PROCESSING',
        financeNote: null,
        updatedAt: expect.any(Date),
      },
    });
    expect(result).toMatchObject({
      returnRequestId: 61,
      refundStatus: 'PROCESSING',
      financeNote: null,
      financeNoteUpdatedAt: null,
      financeNoteUpdatedBy: null,
    });
  });

  it('returns CONFLICT when refund status is changed from a stale operator snapshot', async () => {
    const tx = withReturnRequestClaim({
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 62,
          orderId: 713,
          status: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PENDING',
          financeNote: null,
          updatedAt: new Date('2026-04-05T08:00:00.000Z'),
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    }, 0);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.updateRefundStatus(
        62,
        88,
        {
          refundStatus: 'PROCESSING',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
      details: { reason: 'refund_status_conflict' },
    });

    expect(tx.returnRequest.update).not.toHaveBeenCalled();
    expect(tx.returnRequestStatusLog.create).not.toHaveBeenCalled();
  });

  it('blocks refund status updates while refund is locked by payment confirmation', async () => {
    const tx = {
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 57,
          status: 'PENDING_PAYMENT_CONFIRMATION',
          refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        }),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.updateRefundStatus(
        57,
        88,
        {
          refundStatus: 'PROCESSING',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'RETURN_REFUND_LOCKED',
      status: 409,
    });
  });

  it('requires a comment for failed refund status updates', async () => {
    await expect(
      service.updateRefundStatus(
        58,
        88,
        {
          refundStatus: 'FAILED',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'REFUND_STATUS_COMMENT_REQUIRED',
      status: 400,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('requires a non-empty comment for manual-review refund status updates', async () => {
    await expect(
      service.updateRefundStatus(
        59,
        88,
        {
          refundStatus: 'MANUAL_REVIEW',
          comment: '   ',
        },
        adminWorkflowActor(88),
      ),
    ).rejects.toMatchObject({
      code: 'REFUND_STATUS_COMMENT_REQUIRED',
      status: 400,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('forwards customer return queries to the repository', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [
        {
          returnRequestId: 91,
          status: 'PENDING_PAYMENT_CONFIRMATION',
          financeNote: 'Cần xác minh lại với finance',
          statusLogs: [
            {
              logId: 1,
              fromStatus: 'ACCEPTED_FOR_REFUND',
              toStatus: 'ACCEPTED_FOR_REFUND',
              comment: 'Cần xác minh lại với finance',
              createdAt: '2026-03-26T10:00:00.000Z',
              changedByUser: {
                userId: 44,
                fullName: 'Finance Ops',
              },
            },
          ],
        },
        { returnRequestId: 92, status: 'CLOSED' },
      ],
      pagination: { page: 2, limit: 5, total: 1 },
    });

    const result = await service.getMyReturns(12, 2, 5);

    expect(repoMock.findByUser).toHaveBeenCalledWith(12, 2, 5, {});
    expect(result).toMatchObject({
      data: [
        {
          returnRequestId: 91,
          status: 'PENDING_PAYMENT_CONFIRMATION',
          workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
          statusBucket: 'REQUESTED',
          financeNote: 'Cần xác minh lại với finance',
          financeNoteUpdatedAt: '2026-03-26T10:00:00.000Z',
          financeNoteUpdatedBy: {
            userId: 44,
            fullName: 'Finance Ops',
          },
          statusLogs: [
            {
              logId: 1,
              fromStatus: 'ACCEPTED_FOR_REFUND',
              fromWorkflowStatus: 'ACCEPTED_FOR_REFUND',
              toStatus: 'ACCEPTED_FOR_REFUND',
              toWorkflowStatus: 'ACCEPTED_FOR_REFUND',
              comment: 'Cần xác minh lại với finance',
              createdAt: '2026-03-26T10:00:00.000Z',
              changedByUser: {
                userId: 44,
                fullName: 'Finance Ops',
              },
            },
          ],
          refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        },
        {
          returnRequestId: 92,
          status: 'CLOSED',
          workflowStatus: 'CLOSED',
          statusBucket: 'REFUNDED',
          refundStatus: 'REFUNDED',
        },
      ],
      pagination: { page: 2, limit: 5, total: 1 },
    });
  });

  it('returns compact customer return summaries when summary view is requested', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [
        {
          returnRequestId: 93,
          orderId: 701,
          status: 'ACCEPTED_FOR_REFUND',
          totalRefundAmount: new Prisma.Decimal(150000),
          refundableCapAmount: new Prisma.Decimal(80000),
          updatedAt: '2026-03-26T11:05:00.000Z',
          financeNote: 'Cần đối soát lại với cổng thanh toán',
          statusLogs: [
            {
              logId: 1,
              fromStatus: 'ACCEPTED_FOR_REFUND',
              toStatus: 'ACCEPTED_FOR_REFUND',
              comment: 'Cần đối soát lại với cổng thanh toán',
              createdAt: '2026-03-26T11:00:00.000Z',
              changedByUser: {
                userId: 45,
                fullName: 'Finance Ops',
              },
            },
          ],
          attachments: [{ fileUrl: 'https://example.com/proof.jpg' }],
          items: [
            {
              orderItemId: 10,
              quantity: 1,
              unitPrice: new Prisma.Decimal(80000),
              requestedRefundAmount: new Prisma.Decimal(80000),
              orderItemGrossAmount: new Prisma.Decimal(100000),
              orderItemAllocatedDiscountAmount: new Prisma.Decimal(20000),
              orderItemNetPaidAmount: new Prisma.Decimal(80000),
            },
          ],
        },
      ],
      pagination: { page: 1, limit: 100, total: 1 },
    });

    const result = await service.getMyReturns(12, 1, 100, 'summary');

    expect(repoMock.findByUser).toHaveBeenCalledWith(12, 1, 100, {});
    expect(result).toMatchObject({
      data: [
        {
          returnRequestId: 93,
          orderId: 701,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          statusBucket: 'RECEIVED',
          refundStatus: 'PENDING',
          totalRefundAmount: new Prisma.Decimal(150000),
          refundableCapAmount: new Prisma.Decimal(80000),
          updatedAt: '2026-03-26T11:05:00.000Z',
          financeNote: 'Cần đối soát lại với cổng thanh toán',
          financeNoteUpdatedAt: '2026-03-26T11:00:00.000Z',
          financeNoteUpdatedBy: {
            userId: 45,
            fullName: 'Finance Ops',
          },
          economicsSummary: {
            totalGrossAmount: new Prisma.Decimal(100000),
            totalDiscountAmount: new Prisma.Decimal(20000),
            totalNetPaidAmount: new Prisma.Decimal(80000),
            totalRequestedRefundAmount: new Prisma.Decimal(80000),
            hasSnapshotBreakdown: true,
          },
        },
      ],
      pagination: { page: 1, limit: 100, total: 1 },
    });
  });

  it('throws RETURN_REQUEST_STORAGE_UNAVAILABLE when read delegates are missing', async () => {
    prismaMock.returnRequest = undefined;

    expect(() => service.getMyReturns(12, 2, 5)).toThrow(
      expect.objectContaining({
        code: 'RETURN_REQUEST_STORAGE_UNAVAILABLE',
        status: 503,
      }),
    );

    expect(repoMock.findByUser).not.toHaveBeenCalled();
  });

  it('forwards customer orderId filters to the repository', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });

    await service.getMyReturns(12, 1, 20, 'summary', { orderIds: [11, 12] });

    expect(repoMock.findByUser).toHaveBeenCalledWith(12, 1, 20, { orderIds: [11, 12] });
  });

  it('forwards customer updatedSince filters to the repository', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });
    const updatedSince = new Date('2026-03-26T12:00:00.000Z');

    await service.getMyReturns(12, 1, 20, 'summary', { updatedSince });

    expect(repoMock.findByUser).toHaveBeenCalledWith(12, 1, 20, { updatedSince });
  });

  it('rejects operational workflow mutations when actor lacks return workflow capability', async () => {
    await expect(
      service.approveReturnRequest(50, 5, customerWorkflowActor(5)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });

    expect(repoMock.findById).not.toHaveBeenCalled();
  });

  it('rejects refund workflow mutations when actor lacks refund workflow capability', async () => {
    await expect(
      service.refundReturnRequest(
        55,
        90,
        {
          method: 'ORIGINAL_PAYMENT',
          idempotencyKey: 'staff-refund-blocked',
        },
        staffWorkflowActor(90),
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects payout proof upload when actor lacks refund workflow capability', async () => {
    await expect(
      service.uploadPayoutProofImage(
        90,
        {
          imageData: 'data:image/png;base64,AAA',
          fileName: 'refund-proof.png',
        },
        staffWorkflowActor(90),
      ),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });

    expect(uploadBase64Mock).not.toHaveBeenCalled();
  });

  it('rejects refund payout proof listing when actor lacks refund workflow capability', async () => {
    await expect(
      service.listRefundPayoutProofs(55, staffWorkflowActor(90)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });

    expect(prismaMock.returnRequest.findUnique).toBeUndefined();
  });

  it('allows admins to upload payout proof images through the refund workflow gate', async () => {
    uploadBase64Mock.mockResolvedValueOnce({
      secureUrl: 'https://cdn.example.com/refund-proof-admin.png',
    });

    await expect(
      service.uploadPayoutProofImage(
        88,
        {
          imageData: 'data:image/png;base64,AAA',
          fileName: 'refund-proof-admin.png',
        },
        adminWorkflowActor(88),
      ),
    ).resolves.toEqual({
      fileUrl: 'https://cdn.example.com/refund-proof-admin.png',
      fileName: 'refund-proof-admin.png',
    });

    expect(uploadBase64Mock).toHaveBeenCalledWith('data:image/png;base64,AAA', {
      folder: 'refund-payout-proofs/admin-88',
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });
  });

  it('allows admins to list refund payout proofs through the refund workflow gate', async () => {
    prismaMock.returnRequest.findUnique = jest.fn().mockResolvedValue({
      returnRequestId: 55,
      refundPayoutProofs: [
        {
          refundPayoutProofId: 401,
          refundTransactionId: 301,
          fileUrl: 'https://cdn.example.com/refund-proof-1.png',
          fileName: 'refund-proof-1.png',
          mimeType: 'image/png',
          note: 'Uploaded',
          createdAt: new Date('2026-04-05T08:00:00.000Z'),
          uploadedByUser: {
            userId: 88,
            fullName: 'Admin User',
          },
        },
      ],
    });

    await expect(
      service.listRefundPayoutProofs(55, adminWorkflowActor(88)),
    ).resolves.toEqual([
      expect.objectContaining({
        refundPayoutProofId: 401,
        refundTransactionId: 301,
        fileUrl: 'https://cdn.example.com/refund-proof-1.png',
        fileName: 'refund-proof-1.png',
      }),
    ]);
  });

  it('allows customers to view their own return detail but blocks other customer records', async () => {
    repoMock.findById
      .mockResolvedValueOnce({
        returnRequestId: 91,
        orderId: 700,
        userId: 5,
        status: 'REQUESTED',
      })
      .mockResolvedValueOnce({
        returnRequestId: 92,
        orderId: 701,
        userId: 8,
        status: 'REQUESTED',
      });

    await expect(service.getReturnDetail(91, customerWorkflowActor(5))).resolves.toMatchObject({
      returnRequestId: 91,
      userId: 5,
    });

    await expect(
      service.getReturnDetail(92, customerWorkflowActor(5)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('rejects admin return list queries when actor lacks return workflow capability', async () => {
    expect(() =>
      service.getAdminReturns({ page: 1, limit: 20 }, customerWorkflowActor(5)),
    ).toThrow(expect.objectContaining({
      code: 'FORBIDDEN',
      status: 403,
    }));

    expect(repoMock.findAllAdmin).not.toHaveBeenCalled();
  });

  it('loads admin return summary counts when actor has return workflow capability', async () => {
    repoMock.countAllAdminStatuses.mockResolvedValueOnce({
      ALL: 8,
      REQUESTED: 3,
      APPROVED: 2,
      REJECTED: 1,
      RECEIVED: 1,
      REFUNDED: 1,
    });

    await expect(
      service.getAdminReturnSummary({ orderId: 77 }, adminWorkflowActor(88)),
    ).resolves.toEqual({
      ALL: 8,
      REQUESTED: 3,
      APPROVED: 2,
      REJECTED: 1,
      RECEIVED: 1,
      REFUNDED: 1,
    });

    expect(repoMock.countAllAdminStatuses).toHaveBeenCalledWith({ orderId: 77 });
  });

  it('decorates return detail lookups with workflow and refund state', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 92,
      orderId: 701,
      status: 'CLOSED',
      totalRefundAmount: '150000',
      refundTransactions: [
        { amount: 50000, status: 'COMPLETED' },
      ],
      statusLogs: [
        {
          logId: 1,
          fromStatus: 'IN_RETURN_TRANSIT',
          toStatus: 'RECEIVED_AND_INSPECTING',
        },
      ],
    });

    const result = await service.getReturnDetail(92, adminWorkflowActor(88));

    expect(repoMock.findById).toHaveBeenCalledWith(92);
    expect(result).toMatchObject({
      returnRequestId: 92,
      orderId: 701,
      status: 'CLOSED',
      workflowStatus: 'CLOSED',
      statusBucket: 'REFUNDED',
      refundStatus: 'PARTIALLY_REFUNDED',
      totalRefundAmount: '150000',
      refundTransactions: [
        { amount: 50000, status: 'COMPLETED' },
      ],
      statusLogs: [
        {
          logId: 1,
          fromStatus: 'IN_RETURN_TRANSIT',
          toStatus: 'RECEIVED_AND_INSPECTING',
          fromWorkflowStatus: 'IN_RETURN_TRANSIT',
          toWorkflowStatus: 'RECEIVED_AND_INSPECTING',
        },
      ],
    });
  });

  it('adds item-level refund economics to decorated return details when item snapshots are available', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 96,
      orderId: 704,
      status: 'ACCEPTED_FOR_REFUND',
      totalRefundAmount: '150000',
      attachments: [
        {
          attachmentId: 1,
          fileUrl: 'https://example.com/request-proof.jpg',
          returnRequestItemId: null,
        },
        {
          attachmentId: 2,
          fileUrl: 'https://example.com/item-proof.jpg',
          returnRequestItemId: 1,
        },
      ],
      items: [
        {
          returnRequestItemId: 1,
          quantity: 1,
          unitPrice: new Prisma.Decimal(80000),
          orderItem: {
            orderItemId: 501,
            grossItemAmount: new Prisma.Decimal(100000),
            allocatedDiscountAmount: new Prisma.Decimal(20000),
            netItemPaidAmount: new Prisma.Decimal(80000),
          },
        },
      ],
    });

    const result = await service.getReturnDetail(96, adminWorkflowActor(88));

    expect(result).toMatchObject({
      returnRequestId: 96,
      refundableCapAmount: new Prisma.Decimal(80000),
      items: [
        {
          returnRequestItemId: 1,
          quantity: 1,
          unitPrice: new Prisma.Decimal(80000),
          requestedRefundAmount: new Prisma.Decimal(80000),
          orderItemGrossAmount: new Prisma.Decimal(100000),
          orderItemAllocatedDiscountAmount: new Prisma.Decimal(20000),
          orderItemNetPaidAmount: new Prisma.Decimal(80000),
          attachments: [
            {
              attachmentId: 2,
              fileUrl: 'https://example.com/item-proof.jpg',
              returnRequestItemId: 1,
            },
          ],
        },
      ],
      attachments: [
        {
          attachmentId: 1,
          fileUrl: 'https://example.com/request-proof.jpg',
          returnRequestItemId: null,
        },
        {
          attachmentId: 2,
          fileUrl: 'https://example.com/item-proof.jpg',
          returnRequestItemId: 1,
        },
      ],
    });
  });

  it('preserves item-specific reasonText in decorated return details when storage provides it', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 98,
      orderId: 706,
      status: 'PENDING_ADMIN_REVIEW',
      items: [
        {
          returnRequestItemId: 3,
          orderItemId: 701,
          quantity: 1,
          unitPrice: new Prisma.Decimal(120000),
          reason: 'WRONG_ITEM',
          reasonText: 'received wrong size and wrong color',
        },
      ],
    });

    const result = await service.getReturnDetail(98, adminWorkflowActor(88));

    expect(result).toMatchObject({
      returnRequestId: 98,
      items: [
        {
          returnRequestItemId: 3,
          orderItemId: 701,
          reason: 'WRONG_ITEM',
          reasonText: 'received wrong size and wrong color',
        },
      ],
    });
  });

  it('decorates return detail items with resolved product image fields from variant snapshots', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 99,
      orderId: 707,
      status: 'PENDING_ADMIN_REVIEW',
      items: [
        {
          returnRequestItemId: 4,
          orderItemId: 702,
          quantity: 1,
          unitPrice: new Prisma.Decimal(120000),
          orderItem: {
            orderItemId: 702,
            productName: 'Quan kaki Streetwear',
            variantName: 'S / Den',
            variant: {
              images: [
                {
                  imageUrl: 'https://cdn.example.com/kaki-variant.jpg',
                  thumbnailUrl: 'https://cdn.example.com/kaki-variant-thumb.jpg',
                },
              ],
              product: {
                images: [
                  {
                    imageUrl: 'https://cdn.example.com/kaki-product.jpg',
                    thumbnailUrl: 'https://cdn.example.com/kaki-product-thumb.jpg',
                  },
                ],
              },
            },
          },
        },
      ],
    });

    const result = await service.getReturnDetail(99, adminWorkflowActor(88));

    expect(result).toMatchObject({
      returnRequestId: 99,
      items: [
        {
          orderItem: {
            orderItemId: 702,
            thumbnailUrl: 'https://cdn.example.com/kaki-variant-thumb.jpg',
            imageUrl: 'https://cdn.example.com/kaki-variant.jpg',
            product: {
              thumbnailUrl: 'https://cdn.example.com/kaki-product-thumb.jpg',
              imageUrl: 'https://cdn.example.com/kaki-product.jpg',
              images: [
                {
                  imageUrl: 'https://cdn.example.com/kaki-product.jpg',
                  thumbnailUrl: 'https://cdn.example.com/kaki-product-thumb.jpg',
                },
              ],
            },
          },
        },
      ],
    });
  });

  it('decorates order-based return detail lookups with refund failures', async () => {
    repoMock.findByOrderId.mockResolvedValueOnce({
      returnRequestId: 94,
      orderId: 702,
      status: 'ACCEPTED_FOR_REFUND',
      totalRefundAmount: '80000',
      refundTransactions: [
        { amount: 80000, status: 'FAILED' },
      ],
    });

    const result = await service.getReturnDetailByOrderId(702);

    expect(repoMock.findByOrderId).toHaveBeenCalledWith(702);
    expect(result).toMatchObject({
      returnRequestId: 94,
      orderId: 702,
      status: 'ACCEPTED_FOR_REFUND',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      statusBucket: 'RECEIVED',
      refundStatus: 'FAILED',
      totalRefundAmount: '80000',
      refundTransactions: [
        { amount: 80000, status: 'FAILED' },
      ],
    });
  });

  it('falls back to MANUAL_REVIEW when refund transactions exist with an unknown status', async () => {
    repoMock.findByOrderId.mockResolvedValueOnce({
      returnRequestId: 95,
      orderId: 703,
      status: 'ACCEPTED_FOR_REFUND',
      totalRefundAmount: '80000',
      refundTransactions: [
        { amount: 80000, status: 'RETRY_REQUIRED' },
      ],
    });

    const result = await service.getReturnDetailByOrderId(703);

    expect(result).toMatchObject({
      returnRequestId: 95,
      orderId: 703,
      status: 'ACCEPTED_FOR_REFUND',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      statusBucket: 'RECEIVED',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '80000',
      refundTransactions: [
        { amount: 80000, status: 'RETRY_REQUIRED' },
      ],
    });
  });

  it('decorates admin return queries with derived refund state', async () => {
    const filters = { page: 1, limit: 20, status: 'REQUESTED' as const };
    repoMock.findAllAdmin.mockResolvedValueOnce({
      data: [
        { returnRequestId: 93, status: 'ACCEPTED_FOR_REFUND' },
        { returnRequestId: 94, status: 'PENDING_PAYMENT_CONFIRMATION' },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });

    const result = await service.getAdminReturns(filters, staffWorkflowActor(90));

    expect(repoMock.findAllAdmin).toHaveBeenCalledWith(filters);
    expect(result).toMatchObject({
      data: [
        {
          returnRequestId: 93,
          status: 'ACCEPTED_FOR_REFUND',
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          statusBucket: 'RECEIVED',
          refundStatus: 'PENDING',
        },
        {
          returnRequestId: 94,
          status: 'PENDING_PAYMENT_CONFIRMATION',
          workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
          statusBucket: 'REQUESTED',
          refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  });

  it('adds refund economics breakdown to customer return list records when item snapshots are present', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [
        {
          returnRequestId: 97,
          orderId: 705,
          status: 'ACCEPTED_FOR_REFUND',
          totalRefundAmount: '150000',
          items: [
            {
              returnRequestItemId: 2,
              quantity: 1,
              unitPrice: new Prisma.Decimal(80000),
              orderItem: {
                orderItemId: 601,
                grossItemAmount: new Prisma.Decimal(100000),
                allocatedDiscountAmount: new Prisma.Decimal(20000),
                netItemPaidAmount: new Prisma.Decimal(80000),
              },
            },
          ],
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });

    const result = await service.getMyReturns(12, 1, 20);

    expect(result).toMatchObject({
      data: [
        {
          returnRequestId: 97,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          statusBucket: 'RECEIVED',
          refundStatus: 'PENDING',
          refundableCapAmount: new Prisma.Decimal(80000),
          items: [
            {
              returnRequestItemId: 2,
              requestedRefundAmount: new Prisma.Decimal(80000),
              orderItemGrossAmount: new Prisma.Decimal(100000),
              orderItemAllocatedDiscountAmount: new Prisma.Decimal(20000),
              orderItemNetPaidAmount: new Prisma.Decimal(80000),
            },
          ],
        },
      ],
    });
  });
});
