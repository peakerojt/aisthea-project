const productVariantFindManyMock = jest.fn();
const inventoryUpsertMock = jest.fn();
const purchaseOrderCreateMock = jest.fn();
const purchaseOrderFindUniqueMock = jest.fn();
const purchaseOrderFindUniqueOrThrowMock = jest.fn();
const purchaseOrderUpdateMock = jest.fn();
const purchaseOrderItemFindManyMock = jest.fn();
const purchaseOrderItemUpdateMock = jest.fn();
const goodsReceiptCreateMock = jest.fn();
const goodsReceiptItemCreateMock = jest.fn();
const transactionMock = jest.fn();
const applyPurchaseReceiptStockChangesMock = jest.fn();

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    productVariant: {
      findMany: (...args: unknown[]) => productVariantFindManyMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

jest.mock('../../../services/inventory.service', () => ({
  applyPurchaseReceiptStockChanges: (...args: unknown[]) => applyPurchaseReceiptStockChangesMock(...args),
}));

import {
  cancelPurchaseOrderRecord,
  createPurchaseOrderRecord,
  receivePurchaseOrderRecord,
} from '../purchase-order.service';

const createTx = () => ({
  productVariant: {
    findMany: (...args: unknown[]) => productVariantFindManyMock(...args),
  },
  inventory: {
    upsert: (...args: unknown[]) => inventoryUpsertMock(...args),
  },
  purchaseOrder: {
    create: (...args: unknown[]) => purchaseOrderCreateMock(...args),
    findUnique: (...args: unknown[]) => purchaseOrderFindUniqueMock(...args),
    findUniqueOrThrow: (...args: unknown[]) => purchaseOrderFindUniqueOrThrowMock(...args),
    update: (...args: unknown[]) => purchaseOrderUpdateMock(...args),
  },
  purchaseOrderItem: {
    findMany: (...args: unknown[]) => purchaseOrderItemFindManyMock(...args),
    update: (...args: unknown[]) => purchaseOrderItemUpdateMock(...args),
  },
  goodsReceipt: {
    create: (...args: unknown[]) => goodsReceiptCreateMock(...args),
  },
  goodsReceiptItem: {
    create: (...args: unknown[]) => goodsReceiptItemCreateMock(...args),
  },
});

describe('purchase-order.service incoming inventory sync', () => {
  beforeEach(() => {
    productVariantFindManyMock.mockReset();
    inventoryUpsertMock.mockReset();
    purchaseOrderCreateMock.mockReset();
    purchaseOrderFindUniqueMock.mockReset();
    purchaseOrderFindUniqueOrThrowMock.mockReset();
    purchaseOrderUpdateMock.mockReset();
    purchaseOrderItemFindManyMock.mockReset();
    purchaseOrderItemUpdateMock.mockReset();
    goodsReceiptCreateMock.mockReset();
    goodsReceiptItemCreateMock.mockReset();
    transactionMock.mockReset();
    applyPurchaseReceiptStockChangesMock.mockReset();
  });

  it('syncs incoming inventory quantity when creating a purchase order', async () => {
    const tx = createTx();
    transactionMock.mockImplementation(async (callback: any) => callback(tx));

    productVariantFindManyMock
      .mockResolvedValueOnce([{ variantId: 1 }])
      .mockResolvedValueOnce([{ variantId: 1, stockQuantity: 10 }]);
    purchaseOrderCreateMock.mockResolvedValue({ purchaseOrderId: 11 });
    purchaseOrderItemFindManyMock.mockResolvedValue([
      { variantId: 1, orderedQty: 2, receivedQty: 0 },
    ]);
    inventoryUpsertMock.mockResolvedValue({});
    purchaseOrderFindUniqueOrThrowMock.mockResolvedValue({
      purchaseOrderId: 11,
      purchaseOrderNumber: 'PO-TEST-0001',
      supplier: 'NCC A',
      expectedReceivedAt: null,
      invoiceNumber: null,
      supplierContactName: null,
      supplierPhone: null,
      supplierEmail: null,
      status: 'PENDING',
      notes: null,
      orderedAt: new Date('2026-03-13T00:00:00.000Z'),
      receivedAt: null,
      updatedAt: new Date('2026-03-13T00:00:00.000Z'),
      createdBy: 99,
      items: [],
    });

    await createPurchaseOrderRecord(
      {
        supplier: 'NCC A',
        items: [{ variantId: 1, orderedQty: 2, unitCost: 1000 }],
      },
      99,
    );

    expect(inventoryUpsertMock).toHaveBeenCalledWith({
      where: { variantId: 1 },
      update: { incomingQuantity: 2 },
      create: {
        variantId: 1,
        availableQuantity: 10,
        reservedQuantity: 0,
        incomingQuantity: 2,
      },
    });
  });

  it('syncs remaining incoming inventory after receiving part of a purchase order', async () => {
    const tx = createTx();
    transactionMock.mockImplementation(async (callback: any) => callback(tx));

    purchaseOrderFindUniqueMock.mockResolvedValue({
      purchaseOrderId: 1,
      purchaseOrderNumber: 'PO-001',
      status: 'PENDING',
      invoiceNumber: null,
      notes: null,
      items: [
        {
          purchaseOrderItemId: 10,
          variantId: 9,
          orderedQty: 5,
          receivedQty: 0,
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
    });
    goodsReceiptCreateMock.mockResolvedValue({ goodsReceiptId: 1 });
    purchaseOrderItemUpdateMock.mockResolvedValue({});
    goodsReceiptItemCreateMock.mockResolvedValue({});
    applyPurchaseReceiptStockChangesMock.mockResolvedValue(undefined);
    purchaseOrderItemFindManyMock.mockResolvedValueOnce([
      { orderedQty: 5, receivedQty: 2 },
    ]);
    purchaseOrderUpdateMock.mockResolvedValue({});
    productVariantFindManyMock.mockResolvedValue([{ variantId: 9, stockQuantity: 22 }]);
    purchaseOrderItemFindManyMock.mockResolvedValueOnce([
      { variantId: 9, orderedQty: 5, receivedQty: 2 },
    ]);
    inventoryUpsertMock.mockResolvedValue({});
    purchaseOrderFindUniqueOrThrowMock.mockResolvedValue({
      purchaseOrderId: 1,
      purchaseOrderNumber: 'PO-001',
      supplier: 'NCC A',
      expectedReceivedAt: null,
      invoiceNumber: null,
      supplierContactName: null,
      supplierPhone: null,
      supplierEmail: null,
      status: 'PARTIALLY_RECEIVED',
      notes: null,
      orderedAt: new Date('2026-03-13T00:00:00.000Z'),
      receivedAt: null,
      updatedAt: new Date('2026-03-13T00:00:00.000Z'),
      createdBy: 99,
      items: [],
    });

    await receivePurchaseOrderRecord(
      1,
      { items: [{ purchaseOrderItemId: 10, quantity: 2 }] },
      99,
    );

    expect(inventoryUpsertMock).toHaveBeenCalledWith({
      where: { variantId: 9 },
      update: { incomingQuantity: 3 },
      create: {
        variantId: 9,
        availableQuantity: 22,
        reservedQuantity: 0,
        incomingQuantity: 3,
      },
    });
  });

  it('clears incoming inventory quantity when cancelling an open purchase order', async () => {
    const tx = createTx();
    transactionMock.mockImplementation(async (callback: any) => callback(tx));

    purchaseOrderFindUniqueMock.mockResolvedValue({
      purchaseOrderId: 12,
      status: 'PENDING',
      items: [{ variantId: 9 }],
    });
    purchaseOrderUpdateMock.mockResolvedValue({ purchaseOrderId: 12 });
    productVariantFindManyMock.mockResolvedValue([{ variantId: 9, stockQuantity: 10 }]);
    purchaseOrderItemFindManyMock.mockResolvedValue([]);
    inventoryUpsertMock.mockResolvedValue({});
    purchaseOrderFindUniqueOrThrowMock.mockResolvedValue({
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
      items: [],
    });

    await cancelPurchaseOrderRecord(12, { notes: 'Tam dung nhap hang' });

    expect(inventoryUpsertMock).toHaveBeenCalledWith({
      where: { variantId: 9 },
      update: { incomingQuantity: 0 },
      create: {
        variantId: 9,
        availableQuantity: 10,
        reservedQuantity: 0,
        incomingQuantity: 0,
      },
    });
  });
});
