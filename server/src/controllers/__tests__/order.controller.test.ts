const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

import { confirmReceipt } from '../order.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('order.controller confirmReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks COD payment as completed when customer confirms receipt and payment exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 77,
      userId: 5,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 208000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          paymentId: 91,
          status: 'PENDING',
          paymentMethod: 'COD',
        }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 77 },
      data: { status: 'Delivered' },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 77,
        oldStatus: 'Shipping',
        status: 'Delivered',
        changedBy: 5,
      }),
    });
    expect(tx.payment.findFirst).toHaveBeenCalledWith({
      where: { orderId: 77, paymentMethod: 'COD' },
      orderBy: { paymentId: 'desc' },
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 91 },
      data: expect.objectContaining({
        status: 'COMPLETED',
        note: 'Customer confirmed receipt. COD payment marked as paid.',
      }),
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orderId: 77,
        newStatus: 'Delivered',
      }),
    );
  });

  it('creates a COD payment when customer confirms receipt and no payment exists yet', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 78,
      userId: 6,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 181000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ paymentId: 99 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 6 },
      params: { id: '78' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 78,
        paymentMethod: 'COD',
        amount: 181000,
        status: 'COMPLETED',
        note: 'Customer confirmed receipt. COD payment marked as paid.',
      }),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orderId: 78,
        newStatus: 'Delivered',
      }),
    );
  });
});
