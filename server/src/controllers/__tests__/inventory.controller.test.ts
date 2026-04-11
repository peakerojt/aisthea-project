const findManyMock = jest.fn();
const countMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
};

jest.mock('../../lib/prisma', () => ({
  prisma: {
    productVariant: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
    },
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import { getInventory, getLowStockAlerts } from '../inventory.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createVariant = (overrides: Record<string, unknown> = {}) => ({
  variantId: 1012,
  productId: 93,
  sku: 'SKU-93-1012',
  price: 317000,
  stockQuantity: 50,
  inventorySnapshot: { availableQuantity: 10 },
  product: {
    name: 'Ao blouse Vintage',
    images: [],
  },
  variantAttributes: [],
  ...overrides,
});

describe('inventory.controller', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    countMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('uses inventory snapshot quantity when filtering low stock inventory rows', async () => {
    findManyMock.mockResolvedValueOnce([
      createVariant(),
      createVariant({
        variantId: 1013,
        sku: 'SKU-93-1013',
        inventorySnapshot: { availableQuantity: 50 },
      }),
    ]);

    const req: any = {
      query: {
        lowStock: 'true',
        page: '1',
        pageSize: '20',
      },
    };
    const res = createResponse();

    await getInventory(req, res);

    expect(countMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          variantId: 1012,
          stockQuantity: 10,
        }),
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });
  });

  it('uses inventory snapshot quantity when building low stock alerts', async () => {
    findManyMock.mockResolvedValueOnce([
      createVariant({
        variantId: 1012,
        sku: 'SKU-93-1012',
        stockQuantity: 50,
        inventorySnapshot: { availableQuantity: 10 },
      }),
      createVariant({
        variantId: 1014,
        sku: 'SKU-93-1014',
        stockQuantity: 1,
        inventorySnapshot: { availableQuantity: 50 },
      }),
    ]);

    const res = createResponse();

    await getLowStockAlerts({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      totalLowStock: 1,
      items: [
        expect.objectContaining({
          variantId: 1012,
          stockQuantity: 10,
        }),
      ],
    });
  });
});
