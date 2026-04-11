import {
  applyPurchaseReceiptStockChanges,
  atomicCancelRestore,
  atomicCheckoutDeduction,
} from '../inventory.service';

describe('inventory.service batch stock reads', () => {
  const createTransactionMock = () => ({
    productVariant: {
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    inventory: {
      upsert: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
  });

  it('uses one batched stock read after checkout updates and logs correct deltas', async () => {
    const tx = createTransactionMock();
    tx.productVariant.update.mockResolvedValue(undefined);
    tx.productVariant.findMany.mockResolvedValue([
      { variantId: 11, stockQuantity: 3 },
      { variantId: 22, stockQuantity: 5 },
    ]);

    await atomicCheckoutDeduction(
      9001,
      7,
      [
        { variantId: 11, quantity: 2, productName: 'Ao' },
        { variantId: 22, quantity: 1, productName: 'Quan' },
      ],
      tx as any,
    );

    expect(tx.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.findUnique).not.toHaveBeenCalled();
    expect(tx.inventoryLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        variantId: 11,
        changeQuantity: -2,
        previousStock: 5,
        newStock: 3,
        reason: 'CHECKOUT',
      }),
    });
    expect(tx.inventoryLog.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        variantId: 22,
        changeQuantity: -1,
        previousStock: 6,
        newStock: 5,
        reason: 'CHECKOUT',
      }),
    });
  });

  it('returns a stock-conflict error when checkout tries to consume unavailable stock', async () => {
    const tx = createTransactionMock();
    tx.productVariant.update.mockRejectedValue({ code: 'P2025' });

    await expect(
      atomicCheckoutDeduction(
        9002,
        7,
        [{ variantId: 11, quantity: 2, productName: 'Ao' }],
        tx as any,
      ),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      status: 409,
    });
  });

  it('uses one batched stock read for purchase receipts and preserves previous/new stock values', async () => {
    const tx = createTransactionMock();
    tx.productVariant.update.mockResolvedValue(undefined);
    tx.productVariant.findMany.mockResolvedValue([
      { variantId: 31, stockQuantity: 8 },
      { variantId: 32, stockQuantity: 14 },
    ]);

    const result = await applyPurchaseReceiptStockChanges(
      tx as any,
      [
        {
          variantId: 31,
          quantity: 3,
          userId: 2,
          goodsReceiptId: 100,
          purchaseOrderId: 50,
          note: 'receipt batch',
        },
        {
          variantId: 32,
          quantity: 4,
          userId: 2,
          goodsReceiptId: 100,
          purchaseOrderId: 50,
          note: 'receipt batch',
        },
      ],
    );

    expect(tx.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual([
      { previousStock: 5, newStock: 8 },
      { previousStock: 10, newStock: 14 },
    ]);
    expect(tx.inventoryLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        variantId: 31,
        changeQuantity: 3,
        previousStock: 5,
        newStock: 8,
        reason: 'PURCHASE_RECEIPT',
      }),
    });
  });

  it('uses one batched stock read for cancel restores and writes restore logs from final stock', async () => {
    const tx = createTransactionMock();
    tx.productVariant.update.mockResolvedValue(undefined);
    tx.productVariant.findMany.mockResolvedValue([
      { variantId: 41, stockQuantity: 9 },
      { variantId: 42, stockQuantity: 4 },
    ]);

    await atomicCancelRestore(
      8080,
      3,
      [
        { variantId: 41, quantity: 2 },
        { variantId: 42, quantity: 1 },
      ],
      tx as any,
    );

    expect(tx.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.findUnique).not.toHaveBeenCalled();
    expect(tx.inventoryLog.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        variantId: 41,
        changeQuantity: 2,
        previousStock: 7,
        newStock: 9,
        reason: 'CANCEL_RESTORE',
      }),
    });
    expect(tx.inventoryLog.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        variantId: 42,
        changeQuantity: 1,
        previousStock: 3,
        newStock: 4,
        reason: 'CANCEL_RESTORE',
      }),
    });
  });

  it('writes return-specific ledger reasons when restoring stock for returned orders', async () => {
    const tx = createTransactionMock();
    tx.productVariant.update.mockResolvedValue(undefined);
    tx.productVariant.findMany.mockResolvedValue([{ variantId: 51, stockQuantity: 6 }]);

    await atomicCancelRestore(
      9090,
      8,
      [{ variantId: 51, quantity: 2 }],
      tx as any,
      { restoreType: 'return' },
    );

    expect(tx.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 51,
        reason: 'RETURN_RESTORE',
        note: 'Returned order #9090',
      }),
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 51,
        type: 'RETURN',
        note: 'Returned order #9090',
      }),
    });
  });
});
