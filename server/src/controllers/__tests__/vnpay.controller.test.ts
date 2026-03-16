import crypto from 'crypto';
import querystring from 'qs';

const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  payment: {
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

import { createPaymentUrl, vnpayIpn } from '../vnpay.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const sortObject = (obj: Record<string, string>) => {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).map((key) => encodeURIComponent(key)).sort();

  for (const key of keys) {
    sorted[key] = encodeURIComponent((obj as Record<string, string>)[key]).replace(/%20/g, '+');
  }

  return sorted;
};

const signVnpParams = (params: Record<string, string>) => {
  const sorted = sortObject(params);
  const signData = querystring.stringify(sorted, { encode: false });
  const signed = crypto
    .createHmac('sha512', process.env.VNP_HASH_SECRET as string)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return {
    ...params,
    vnp_SecureHash: signed,
  };
};

describe('vnpay.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VNP_TMN_CODE = 'TESTTMN';
    process.env.VNP_HASH_SECRET = 'super-secret-key';
    process.env.VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    process.env.VNP_RETURN_URL = 'http://localhost:5173/vnpay-return';
  });

  it('creates a payment URL from the persisted order total instead of trusting client amount', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 88,
      userId: 5,
      paymentMethod: 'VNPAY',
      totalAmount: 1188000,
      payments: [],
    });

    const req: any = {
      user: { userId: 5 },
      body: {
        orderId: 88,
        amount: 1,
        orderDescription: 'Thanh toan don hang 88',
        orderType: 'other',
      },
      headers: {},
      connection: { remoteAddress: '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createResponse();

    await createPaymentUrl(req, res);

    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: { orderId: 88 },
      include: {
        payments: {
          orderBy: { paymentId: 'desc' },
        },
      },
    });

    const payload = res.json.mock.calls[0][0];
    const url = new URL(payload.vnpUrl);

    expect(url.searchParams.get('vnp_TxnRef')).toBe('88');
    expect(url.searchParams.get('vnp_Amount')).toBe('118800000');
  });

  it('marks VNPay payments as failed when gateway amount mismatches the order total', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 88,
      totalAmount: 1188000,
      payments: [
        {
          paymentId: 9,
          paymentMethod: 'VNPAY',
          status: 'PENDING',
          transactionCode: null,
        },
      ],
    });

    const req: any = {
      query: signVnpParams({
        vnp_Amount: '150000000',
        vnp_ResponseCode: '00',
        vnp_TransactionNo: 'TXN-123',
        vnp_TxnRef: '88',
      }),
    };
    const res = createResponse();

    await vnpayIpn(req, res);

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 9 },
      data: {
        amount: 1500000,
        status: 'FAILED',
        transactionCode: 'TXN-123',
        note: 'VNPay amount mismatch. Expected 1188000, received 1500000.',
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ RspCode: '04', Message: 'Invalid amount' });
  });
});
