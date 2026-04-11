const createPurchaseOrderRecordMock = jest.fn();
const receivePurchaseOrderRecordMock = jest.fn();
const cancelPurchaseOrderRecordMock = jest.fn();
const listPurchaseOrdersDataMock = jest.fn();
const getPurchaseOrderDetailDataMock = jest.fn();

class MockPurchaseOrderServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'PurchaseOrderServiceError';
    this.status = status;
    this.code = code;
  }
}

jest.mock('../purchase-order.service', () => ({
  PurchaseOrderServiceError: MockPurchaseOrderServiceError,
  createPurchaseOrderRecord: (...args: unknown[]) => createPurchaseOrderRecordMock(...args),
  receivePurchaseOrderRecord: (...args: unknown[]) => receivePurchaseOrderRecordMock(...args),
  cancelPurchaseOrderRecord: (...args: unknown[]) => cancelPurchaseOrderRecordMock(...args),
  listPurchaseOrdersData: (...args: unknown[]) => listPurchaseOrdersDataMock(...args),
  getPurchaseOrderDetailData: (...args: unknown[]) => getPurchaseOrderDetailDataMock(...args),
  normalizePurchaseOrderStatus: jest.fn((value: unknown) =>
    typeof value === 'string' ? value.toUpperCase() : null),
}));

import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
} from '../purchase-order.controller';

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
    createPurchaseOrderRecordMock.mockRejectedValue(
      new MockPurchaseOrderServiceError(400, 'PURCHASE_ORDER_EMAIL_INVALID'),
    );

    const req: Req = {
      body: {
        supplier: 'NCC A',
        supplierEmail: 'invalid-email',
        items: [{ variantId: 1, orderedQty: 2, unitCost: 1000 }],
      },
    };
    const res = mockRes();

    await createPurchaseOrder(req as any, res as any);

    expect(createPurchaseOrderRecordMock).toHaveBeenCalledWith(req.body, null);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'PURCHASE_ORDER_EMAIL_INVALID', success: false }),
    );
  });

  it('creates purchase order with extended fields', async () => {
    createPurchaseOrderRecordMock.mockResolvedValue({
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
      totals: { orderedQty: 2, receivedQty: 0, totalCost: 2000 },
      items: [
        {
          purchaseOrderItemId: 1,
          variantId: 1,
          sku: 'SKU-1',
          productId: 12,
          productName: 'Ao',
          orderedQty: 2,
          receivedQty: 0,
          remainingQty: 2,
          unitCost: 1000,
          lineTotal: 2000,
          currentStockQuantity: 10,
        },
      ],
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

    expect(createPurchaseOrderRecordMock).toHaveBeenCalledWith(req.body, 99);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        code: 'PURCHASE_ORDER_CREATED',
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
    receivePurchaseOrderRecordMock.mockRejectedValue(
      new MockPurchaseOrderServiceError(400, 'RECEIPT_EXCEEDS_ORDERED_QTY'),
    );

    const req: Req = {
      params: { id: '1' },
      body: {
        items: [{ purchaseOrderItemId: 10, quantity: 2 }],
      },
    };
    const res = mockRes();

    await receivePurchaseOrder(req as any, res as any);

    expect(receivePurchaseOrderRecordMock).toHaveBeenCalledWith(1, req.body, null);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'RECEIPT_EXCEEDS_ORDERED_QTY', success: false }),
    );
  });

  it('cancels pending purchase order and returns updated detail', async () => {
    cancelPurchaseOrderRecordMock.mockResolvedValue({
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
      totals: { orderedQty: 4, receivedQty: 0, totalCost: 1000000 },
      items: [
        {
          purchaseOrderItemId: 3,
          variantId: 9,
          sku: 'SKU-9',
          productId: 21,
          productName: 'Ao so mi',
          orderedQty: 4,
          receivedQty: 0,
          remainingQty: 4,
          unitCost: 250000,
          lineTotal: 1000000,
          currentStockQuantity: 10,
        },
      ],
    });

    const req: Req = {
      params: { id: '12' },
      body: { notes: 'Tam dung nhap hang' },
    };
    const res = mockRes();

    await cancelPurchaseOrder(req as any, res as any);

    expect(cancelPurchaseOrderRecordMock).toHaveBeenCalledWith(12, { notes: 'Tam dung nhap hang' });
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
