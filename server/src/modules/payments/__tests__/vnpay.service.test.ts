const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  payment: {
    update: jest.fn(),
    create: jest.fn(),
  },
};

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../../lib/logger', () => ({
  logger: loggerMock,
}));

import {
  createVnpayPaymentUrl,
  handleVnpayIpn,
  handleVnpayReturn,
} from '../vnpay.service';
import { createVnpSecureHash } from '../vnpay.utils';

const signParams = (params: Record<string, string>) => ({
  ...params,
  vnp_SecureHash: createVnpSecureHash(params, process.env.VNP_HASH_SECRET as string),
});

describe('vnpay.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VNP_TMN_CODE = 'TESTTMN';
    process.env.VNP_HASH_SECRET = 'super-secret-key';
    process.env.VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    process.env.VNP_RETURN_URL = 'http://localhost:5173/vnpay-return';
  });

  it('returns unauthorized when user id is missing while creating payment URL', async () => {
    const result = await createVnpayPaymentUrl({
      userId: undefined,
      orderId: 10,
    });

    expect(result).toEqual({
      status: 401,
      body: { errorCode: 'UNAUTHORIZED' },
    });
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns missing order id when create payment URL is called without order id', async () => {
    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: undefined,
    });

    expect(result).toEqual({
      status: 400,
      body: { errorCode: 'MISSING_ORDER_ID' },
    });
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns invalid order id when create payment URL receives a non-positive order id', async () => {
    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 'abc',
    });

    expect(result).toEqual({
      status: 400,
      body: { errorCode: 'INVALID_ORDER_ID' },
    });
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns config missing when VNPay environment variables are incomplete', async () => {
    delete process.env.VNP_URL;

    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 20,
    });

    expect(result).toEqual({
      status: 500,
      body: {
        errorCode: 'CREATE_PAYMENT_URL_FAILED',
        messageKey: 'payments:errors.configMissing',
      },
    });
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns order not found when create payment URL cannot load the order', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);

    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 28,
    });

    expect(result).toEqual({
      status: 404,
      body: { errorCode: 'ORDER_NOT_FOUND' },
    });
  });

  it('returns conflict when the order already has a completed VNPay payment', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 25,
      userId: 5,
      paymentMethod: 'VNPAY',
      totalAmount: 500000,
      payments: [
        {
          paymentId: 91,
          paymentMethod: 'VNPAY',
          status: 'COMPLETED',
          transactionCode: 'TXN-91',
        },
      ],
    });

    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 25,
    });

    expect(result).toEqual({
      status: 409,
      body: { errorCode: 'ORDER_ALREADY_PAID' },
    });
  });

  it('returns forbidden when the order belongs to another user', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 26,
      userId: 99,
      paymentMethod: 'VNPAY',
      totalAmount: 500000,
      payments: [],
    });

    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 26,
    });

    expect(result).toEqual({
      status: 403,
      body: { errorCode: 'FORBIDDEN' },
    });
  });

  it('returns bad request when the order is not configured for VNPay', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 27,
      userId: 5,
      paymentMethod: 'COD',
      totalAmount: 500000,
      payments: [],
    });

    const result = await createVnpayPaymentUrl({
      userId: 5,
      orderId: 27,
    });

    expect(result).toEqual({
      status: 400,
      body: { errorCode: 'ORDER_NOT_VNPAY' },
    });
  });

  it('rejects VNPay return when secure hash is invalid', async () => {
    const result = await handleVnpayReturn({
      vnp_TxnRef: '19',
      vnp_Amount: '32600000',
      vnp_ResponseCode: '00',
      vnp_SecureHash: 'invalid-signature',
    });

    expect(result).toEqual({
      status: 200,
      body: { message: 'Fail checksum', code: '97' },
    });
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('marks payment as failed when VNPay return carries a failed response code', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 39,
      totalAmount: 326000,
      payments: [
        {
          paymentId: 50,
          paymentMethod: 'VNPAY',
          status: 'PENDING',
          transactionCode: null,
        },
      ],
    });

    const result = await handleVnpayReturn(signParams({
      vnp_TxnRef: '39',
      vnp_Amount: '32600000',
      vnp_ResponseCode: '24',
      vnp_TransactionNo: 'TXN-FAILED-39',
    }));

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 50 },
      data: {
        amount: 326000,
        status: 'FAILED',
        transactionCode: 'TXN-FAILED-39',
        note: 'VNPay return failed with response code 24',
      },
    });
    expect(result).toEqual({
      status: 200,
      body: {
        message: 'Failed',
        code: '24',
        orderId: 39,
        paymentStatus: 'FAILED',
      },
    });
  });

  it('returns duplicate update code when IPN arrives for an already completed payment', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 31,
      totalAmount: 326000,
      payments: [
        {
          paymentId: 44,
          paymentMethod: 'VNPAY',
          status: 'PAID',
          transactionCode: 'TXN-44',
        },
      ],
    });

    const result = await handleVnpayIpn(signParams({
      vnp_TxnRef: '31',
      vnp_Amount: '32600000',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: 'TXN-44',
    }));

    expect(result).toEqual({
      status: 200,
      body: {
        RspCode: '02',
        Message: 'This order has been updated to the payment status',
      },
    });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('marks payment as failed when VNPay return amount mismatches order total', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 41,
      totalAmount: 326000,
      payments: [
        {
          paymentId: 52,
          paymentMethod: 'VNPAY',
          status: 'PENDING',
          transactionCode: null,
        },
      ],
    });

    const result = await handleVnpayReturn(signParams({
      vnp_TxnRef: '41',
      vnp_Amount: '50000000',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: 'TXN-MISMATCH-41',
    }));

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 52 },
      data: {
        amount: 500000,
        status: 'FAILED',
        transactionCode: 'TXN-MISMATCH-41',
        note: 'VNPay amount mismatch. Expected 326000, received 500000.',
      },
    });
    expect(loggerMock.warn).toHaveBeenCalledWith('VNPay return amount mismatch', {
      orderId: 41,
      expectedAmount: 326000,
      gatewayAmount: 500000,
    });
    expect(result).toEqual({
      status: 200,
      body: {
        message: 'Failed',
        code: '04',
        orderId: 41,
        paymentStatus: 'FAILED',
      },
    });
  });
});
