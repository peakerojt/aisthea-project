import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
} from '../purchase-order.controller';
import { prisma } from '../../../lib/prisma';

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    productVariant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrder: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

type Req = {
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: { userId: number };
};

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('purchase-order.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates supplier email format on create', async () => {
    const req: Req = {
      body: {
        supplier: 'NCC A',
        supplierEmail: 'invalid-email',
        items: [{ variantId: 1, orderedQty: 2, unitCost: 1000 }],
      },
    };
    const res = mockRes();

    await createPurchaseOrder(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'PURCHASE_ORDER_EMAIL_INVALID', success: false }),
    );
  });

  it('creates purchase order with extended fields', async () => {
    const findManyMock = prisma.productVariant.findMany as unknown as jest.Mock;
    findManyMock.mockResolvedValue([{ variantId: 1 }]);

    const transactionMock = prisma.$transaction as unknown as jest.Mock;
    transactionMock.mockImplementation(async (callback: any) => {
      const tx = {
        purchaseOrder: {
          create: jest.fn().mockResolvedValue({ purchaseOrderId: 11 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            purchaseOrderId: 11,
            purchaseOrderNumber: 'PO-TEST-0001',
            supplier: 'NCC A',
            expectedReceivedAt: new Date('2099-03-20T00:00:00.000Z'),
            invoiceNumber: 'INV-100',
            supplierContactName: 'Nguyen Van A',
            supplierPhone: '+84912345678',
            supplierEmail: 'supplier@example.com',
            status: 'PENDING',
            notes: 'ghi chu',
            orderedAt: new Date('2026-03-13T00:00:00.000Z'),
            receivedAt: null,
            updatedAt: new Date('2026-03-13T00:00:00.000Z'),
            createdBy: 99,
            items: [
              {
                purchaseOrderItemId: 1,
                variantId: 1,
                orderedQty: 2,
                receivedQty: 0,
                unitCost: 1000,
                variant: {
                  variantId: 1,
                  productId: 12,
                  sku: 'SKU-1',
                  stockQuantity: 10,
                  product: { productId: 12, name: 'Ao' },
                },
              },
            ],
          }),
        },
      };
      return callback(tx);
    });

    const req: Req = {
      user: { userId: 99 },
      body: {
        supplier: 'NCC A',
        expectedReceivedAt: '2099-03-20T00:00:00.000Z',
        invoiceNumber: 'INV-100',
        supplierContactName: 'Nguyen Van A',
        supplierPhone: '+84912345678',
        supplierEmail: 'supplier@example.com',
        notes: 'ghi chu',
        items: [{ variantId: 1, orderedQty: 2, unitCost: 1000 }],
      },
    };
    const res = mockRes();

    await createPurchaseOrder(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          supplier: 'NCC A',
          invoiceNumber: 'INV-100',
          supplierContactName: 'Nguyen Van A',
          supplierPhone: '+84912345678',
          supplierEmail: 'supplier@example.com',
        }),
      }),
    );
  });

  it('rejects over-receipt quantity', async () => {
    const transactionMock = prisma.$transaction as unknown as jest.Mock;
    transactionMock.mockImplementation(async (callback: any) => {
      const tx = {
        purchaseOrder: {
          findUnique: jest.fn().mockResolvedValue({
            purchaseOrderId: 1,
            purchaseOrderNumber: 'PO-001',
            status: 'PENDING',
            invoiceNumber: null,
            items: [
              {
                purchaseOrderItemId: 10,
                variantId: 9,
                orderedQty: 5,
                receivedQty: 4,
                unitCost: 1000,
                variant: {
                  variantId: 9,
                  productId: 1,
                  sku: 'SKU-9',
                  stockQuantity: 20,
                  product: { productId: 1, name: 'Ao khoac' },
                },
              },
            ],
          }),
          update: jest.fn(),
          findUniqueOrThrow: jest.fn(),
        },
        purchaseOrderItem: {
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        productVariant: {
          findUnique: jest.fn().mockResolvedValue({ stockQuantity: 20 }),
          update: jest.fn(),
        },
        inventoryLog: {
          create: jest.fn(),
        },
        goodsReceipt: {
          create: jest.fn().mockResolvedValue({ goodsReceiptId: 1 }),
        },
        goodsReceiptItem: {
          create: jest.fn(),
        },
      };
      return callback(tx);
    });

    const req: Req = {
      params: { id: '1' },
      body: {
        items: [{ purchaseOrderItemId: 10, quantity: 2 }],
      },
    };
    const res = mockRes();

    await receivePurchaseOrder(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'RECEIPT_EXCEEDS_ORDERED_QTY', success: false }),
    );
  });

  it('cancels pending purchase order and returns updated detail', async () => {
    const findUniqueMock = prisma.purchaseOrder.findUnique as unknown as jest.Mock;
    const updateMock = prisma.purchaseOrder.update as unknown as jest.Mock;

    findUniqueMock
      .mockResolvedValueOnce({
        purchaseOrderId: 12,
        status: 'PENDING',
      })
      .mockResolvedValueOnce({
        purchaseOrderId: 12,
        purchaseOrderNumber: 'PO-TEST-0012',
        supplier: 'NCC B',
        expectedReceivedAt: null,
        invoiceNumber: null,
        supplierContactName: null,
        supplierPhone: null,
        supplierEmail: null,
        status: 'CANCELLED',
        notes: 'Tam dung nhap hang',
        orderedAt: new Date('2026-03-13T00:00:00.000Z'),
        receivedAt: null,
        updatedAt: new Date('2026-03-13T00:05:00.000Z'),
        createdBy: 77,
        items: [
          {
            purchaseOrderItemId: 3,
            variantId: 9,
            orderedQty: 4,
            receivedQty: 0,
            unitCost: 250000,
            variant: {
              variantId: 9,
              productId: 21,
              sku: 'SKU-9',
              stockQuantity: 10,
              product: { productId: 21, name: 'Ao so mi' },
            },
          },
        ],
      });
    updateMock.mockResolvedValue({ purchaseOrderId: 12 });

    const req: Req = {
      params: { id: '12' },
      body: { notes: 'Tam dung nhap hang' },
    };
    const res = mockRes();

    await cancelPurchaseOrder(req as any, res as any);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { purchaseOrderId: 12 },
        data: expect.objectContaining({
          status: 'CANCELLED',
          notes: 'Tam dung nhap hang',
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        code: 'PURCHASE_ORDER_CANCELLED',
        data: expect.objectContaining({
          purchaseOrderId: 12,
          status: 'CANCELLED',
          notes: 'Tam dung nhap hang',
        }),
      }),
    );
  });
});
