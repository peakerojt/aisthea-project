import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Restock } from '@/admin/pages/Restock';

const fetchInventoryPageMock = vi.fn();
const fetchAllInventoryMock = vi.fn();
const fetchInventorySummaryMock = vi.fn();
const listPurchaseOrdersMock = vi.fn();
const createPurchaseOrderMock = vi.fn();
const receivePurchaseOrderMock = vi.fn();
const cancelPurchaseOrderMock = vi.fn();

vi.mock('@/common/services/inventory.service', () => ({
  fetchAllInventory: (...args: unknown[]) => fetchAllInventoryMock(...args),
  fetchInventorySummary: (...args: unknown[]) => fetchInventorySummaryMock(...args),
  fetchInventoryPage: (...args: unknown[]) => fetchInventoryPageMock(...args),
}));

vi.mock('@/common/services/purchase-order.service', () => ({
  listPurchaseOrders: (...args: unknown[]) => listPurchaseOrdersMock(...args),
  createPurchaseOrder: (...args: unknown[]) => createPurchaseOrderMock(...args),
  receivePurchaseOrder: (...args: unknown[]) => receivePurchaseOrderMock(...args),
  cancelPurchaseOrder: (...args: unknown[]) => cancelPurchaseOrderMock(...args),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('Restock page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    fetchInventoryPageMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 40, totalPages: 1 },
    });
    fetchAllInventoryMock.mockResolvedValue([]);
    fetchInventorySummaryMock.mockResolvedValue({
      data: { totalVariants: 0, outOfStock: 0, lowStock: 0 },
    });
    listPurchaseOrdersMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 },
    });
    createPurchaseOrderMock.mockResolvedValue({});
    receivePurchaseOrderMock.mockResolvedValue({});
    cancelPurchaseOrderMock.mockResolvedValue({});
  });

  it('loads inventory, summary, and purchase orders only once on initial render', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(fetchInventoryPageMock).toHaveBeenCalledTimes(1);
      expect(fetchInventorySummaryMock).toHaveBeenCalledTimes(1);
      expect(listPurchaseOrdersMock).toHaveBeenCalledTimes(1);
    });
  });

  it('autofills supplier fields from a saved supplier preset in the create PO modal', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'restock:po.actions.newPo' }));

    expect(await screen.findByText('restock:po.create.title')).toBeInTheDocument();

    const createModal = screen.getByText('restock:po.create.title').closest('[role="dialog"]') ?? document.body;
    const selects = within(createModal).getAllByRole('combobox');

    await user.selectOptions(selects[0], 'default-minh-anh');

    expect(within(createModal).getByPlaceholderText('restock:po.create.placeholders.supplier')).toHaveValue('Xưởng may Minh Anh');
    expect(within(createModal).getByPlaceholderText('restock:po.create.placeholders.contactName')).toHaveValue('Nguyễn Minh Anh');
    expect(within(createModal).getByPlaceholderText('restock:po.create.placeholders.phone')).toHaveValue('0901234567');
    expect(within(createModal).getByPlaceholderText('restock:po.create.placeholders.email')).toHaveValue('minhanh.supplier@example.com');
    expect(within(createModal).getByPlaceholderText('restock:po.create.placeholders.notes')).toHaveValue('Giao trước 17h, ưu tiên đủ size S và M.');
  });

  it('opens supplier management from the header and uses edited supplier details for autofill', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'restock:po.actions.suppliers' }));

    const supplierModal = await screen.findByText('restock:po.create.supplierLibrary.title');
    const supplierDialog = supplierModal.closest('[role="dialog"]') ?? document.body;

    const contactNameInput = within(supplierDialog).getByDisplayValue('Nguyễn Minh Anh');
    await user.clear(contactNameInput);
    await user.type(contactNameInput, 'Lê Thu Hà');

    await user.click(within(supplierDialog).getByRole('button', { name: 'restock:po.create.supplierLibrary.saveEdit' }));

    await user.click(await screen.findByRole('button', { name: 'restock:po.actions.newPo' }));

    const createModal = await screen.findByText('restock:po.create.title');
    const createDialog = createModal.closest('[role="dialog"]') ?? document.body;
    const selects = within(createDialog).getAllByRole('combobox');

    await user.selectOptions(selects[0], 'default-minh-anh');

    expect(within(createDialog).getByPlaceholderText('restock:po.create.placeholders.contactName')).toHaveValue('Lê Thu Hà');
  });

  it('shows create validation errors inside the create PO modal', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'restock:po.actions.newPo' }));

    const createModal = await screen.findByText('restock:po.create.title');
    const createDialog = createModal.closest('[role="dialog"]') ?? document.body;

    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.actions.create' }));

    expect(within(createDialog).getByRole('alert')).toHaveTextContent('restock:po.errors.supplierRequired');
  });

  it('formats bulk quantity and unit cost for readability and applies both per selected product group', async () => {
    fetchInventoryPageMock.mockResolvedValue({
      data: [
        {
          variantId: 101,
          productId: 1,
          sku: 'SKU-LOW-101',
          price: 300000,
          stockQuantity: 5,
          variantLabel: 'Đen/M',
          product: { name: 'Áo blazer Minimal', primaryImageUrl: null },
        },
        {
          variantId: 102,
          productId: 2,
          sku: 'SKU-OUT-102',
          price: 280000,
          stockQuantity: 0,
          variantLabel: 'Trắng/S',
          product: { name: 'Áo hoodie Vintage', primaryImageUrl: null },
        },
      ],
      meta: { total: 2, page: 1, pageSize: 40, totalPages: 1 },
    });
    fetchAllInventoryMock.mockResolvedValue([
      {
        variantId: 101,
        productId: 1,
        sku: 'SKU-LOW-101',
        price: 300000,
        stockQuantity: 5,
        variantLabel: 'Đen/M',
        product: { name: 'Áo blazer Minimal', primaryImageUrl: null },
      },
      {
        variantId: 102,
        productId: 1,
        sku: 'SKU-OUT-102',
        price: 280000,
        stockQuantity: 0,
        variantLabel: 'Trắng/S',
        product: { name: 'Áo blazer Minimal', primaryImageUrl: null },
      },
      {
        variantId: 103,
        productId: 3,
        sku: 'SKU-OK-103',
        price: 350000,
        stockQuantity: 48,
        variantLabel: 'Xanh/L',
        product: { name: 'Áo sơ mi Linen', primaryImageUrl: null },
      },
    ]);
    fetchInventorySummaryMock.mockResolvedValue({
      data: { totalVariants: 3, outOfStock: 1, lowStock: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'restock:po.actions.newPo' }));

    const createModal = await screen.findByText('restock:po.create.title');
    const createDialog = createModal.closest('[role="dialog"]') ?? document.body;
    const supplierSelect = within(createDialog).getAllByRole('combobox')[0];

    await user.selectOptions(supplierSelect, 'default-minh-anh');
    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.create.quickAddLow' }));
    await waitFor(() => {
      const draftSelects = within(createDialog)
        .getAllByRole('combobox')
        .filter((element) => element.getAttribute('aria-label') !== 'restock:po.create.bulkPricing.groupLabel');

      expect(draftSelects).toHaveLength(2);
      expect(draftSelects[1]).toHaveValue('101');
    });

    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.create.quickAddOut' }));

    await waitFor(() => {
      const draftSelects = within(createDialog)
        .getAllByRole('combobox')
        .filter((element) => element.getAttribute('aria-label') !== 'restock:po.create.bulkPricing.groupLabel');

      expect(draftSelects).toHaveLength(3);
      expect(draftSelects[1]).toHaveValue('101');
      expect(draftSelects[2]).toHaveValue('102');
    });

    await user.selectOptions(
      within(createDialog).getByRole('combobox', { name: 'restock:po.create.bulkPricing.groupLabel' }),
      '1',
    );

    const bulkQtyInput = within(createDialog).getByRole('textbox', { name: 'restock:po.create.bulkQuantity.label' });
    await user.clear(bulkQtyInput);
    await user.type(bulkQtyInput, '0');
    expect(bulkQtyInput).toHaveValue('');
    await user.type(bulkQtyInput, '2400');
    expect(bulkQtyInput).toHaveValue('2.400');

    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.create.bulkQuantity.apply' }));

    const bulkCostInput = within(createDialog).getByRole('textbox', { name: 'restock:po.create.bulkPricing.label' });
    await user.clear(bulkCostInput);
    await user.type(bulkCostInput, '0');
    expect(bulkCostInput).toHaveValue('');
    await user.type(bulkCostInput, '125000');
    expect(bulkCostInput).toHaveValue('125.000');

    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.create.bulkPricing.apply' }));
    await user.click(within(createDialog).getByRole('button', { name: 'restock:po.actions.create' }));

    expect(createPurchaseOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      supplier: 'Xưởng may Minh Anh',
      items: expect.arrayContaining([
        expect.objectContaining({ variantId: 101, orderedQty: 2400, unitCost: 125000 }),
        expect.objectContaining({ variantId: 102, orderedQty: 2400, unitCost: 125000 }),
      ]),
    }));
    expect(createPurchaseOrderMock).not.toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ variantId: 103, orderedQty: 2400, unitCost: 125000 }),
      ]),
    }));
  });

  it('keeps summary cards and purchase orders stable during manual refresh', async () => {
    const initialInventory = {
      data: [
        {
          variantId: 201,
          productId: 11,
          sku: 'SKU-RESTOCK-201',
          price: 310000,
          stockQuantity: 7,
          variantLabel: 'Navy/M',
          product: { name: 'Ao khoac Utility', primaryImageUrl: null },
        },
      ],
      meta: { total: 1, page: 1, pageSize: 40, totalPages: 1 },
    };
    const initialSummary = {
      data: { totalVariants: 12, outOfStock: 3, lowStock: 2 },
    };
    const initialOrders = {
      data: [
        {
          purchaseOrderId: 77,
          purchaseOrderNumber: 'PO-2026-001',
          supplier: 'Xuong vai An Phu',
          expectedReceivedAt: '2026-04-15T08:30:00.000Z',
          orderedAt: '2026-04-11T08:30:00.000Z',
          status: 'PENDING',
          invoiceNumber: 'INV-77',
          totals: { receivedQty: 0, orderedQty: 24, totalCost: 5400000 },
          items: [],
          notes: null,
        },
      ],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    };

    const inventoryRefresh = deferred<typeof initialInventory>();
    const summaryRefresh = deferred<typeof initialSummary>();
    const ordersRefresh = deferred<typeof initialOrders>();

    fetchInventoryPageMock
      .mockResolvedValueOnce(initialInventory)
      .mockImplementationOnce(() => inventoryRefresh.promise);
    fetchInventorySummaryMock
      .mockResolvedValueOnce(initialSummary)
      .mockImplementationOnce(() => summaryRefresh.promise);
    listPurchaseOrdersMock
      .mockResolvedValueOnce(initialOrders)
      .mockImplementationOnce(() => ordersRefresh.promise);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    expect(await screen.findByText('PO-2026-001')).toBeInTheDocument();

    const totalCard = screen.getByText('restock:po.inventory.stats.total').closest('div');
    expect(totalCard).toHaveTextContent('12');

    await user.click(screen.getByRole('button', { name: 'restock:po.actions.refresh' }));

    const refreshButton = screen.getByRole('button', { name: 'restock:po.actions.refresh' });
    await waitFor(() => {
      expect(refreshButton).toHaveAttribute('aria-busy', 'true');
    });

    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('restock:po.states.loading')).not.toBeInTheDocument();
    expect(totalCard).toHaveTextContent('12');

    ordersRefresh.resolve(initialOrders);
    summaryRefresh.resolve(initialSummary);
    inventoryRefresh.resolve(initialInventory);

    await waitFor(() => {
      expect(refreshButton).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('keeps the inventory viewport height stable when switching to low-stock items', async () => {
    fetchInventoryPageMock
      .mockResolvedValueOnce({
        data: [
          {
            variantId: 301,
            productId: 21,
            sku: 'SKU-OK-301',
            price: 300000,
            stockQuantity: 50,
            variantLabel: 'Den/S',
            product: { name: 'Ao blazer Minimal', primaryImageUrl: null },
          },
          {
            variantId: 302,
            productId: 22,
            sku: 'SKU-LOW-302',
            price: 280000,
            stockQuantity: 10,
            variantLabel: 'Trang/S',
            product: { name: 'Ao blouse Vintage', primaryImageUrl: null },
          },
        ],
        meta: { total: 2, page: 1, pageSize: 40, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [
          {
            variantId: 302,
            productId: 22,
            sku: 'SKU-LOW-302',
            price: 280000,
            stockQuantity: 10,
            variantLabel: 'Trang/S',
            product: { name: 'Ao blouse Vintage', primaryImageUrl: null },
          },
        ],
        meta: { total: 1, page: 1, pageSize: 40, totalPages: 1 },
      });
    fetchInventorySummaryMock.mockResolvedValue({
      data: { totalVariants: 2, outOfStock: 0, lowStock: 1 },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Restock />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();

    expect(await screen.findByText('Ao blazer Minimal')).toBeInTheDocument();

    const inventoryViewport = screen.getByTestId('restock-inventory-viewport');
    expect(inventoryViewport).toHaveStyle({ height: 'min(420px, 40vh)' });

    await user.click(screen.getByRole('button', { name: 'restock:po.inventory.stats.low' }));

    await waitFor(() => {
      expect(fetchInventoryPageMock).toHaveBeenLastCalledWith(
        { search: undefined, lowStock: true },
        1,
        40,
      );
    });

    expect(inventoryViewport).toHaveStyle({ height: 'min(420px, 40vh)' });
    expect(await screen.findByText('Ao blouse Vintage')).toBeInTheDocument();
  });
});
