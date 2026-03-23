import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ban, ChevronLeft, ChevronRight, Eye, Plus, RefreshCw, Truck, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminActionButton,
  AdminBadge,
  AdminIconButton,
  AdminModalShell,
  AdminPageHeader,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminStatCards,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import {
  fetchAllInventory,
  fetchInventorySummary,
  fetchInventoryPage,
  type InventoryVariant,
} from '@/common/services/inventory.service';
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/common/services/purchase-order.service';

type DraftItem = { variantId: number | ''; orderedQty: number; unitCost: number };
type VariantOption = { value: number; label: string };
type ReceiveMap = Record<number, number>;
type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
type InventorySummary = {
  total: number;
  out: number;
  low: number;
  ok: number;
};

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;
const isPositiveFiniteNumber = (value: number) => Number.isFinite(value) && value > 0;

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getStatusBadgeTone = (status: PurchaseOrderStatus) => {
  if (status === 'RECEIVED') return 'success' as const;
  if (status === 'PARTIALLY_RECEIVED') return 'warning' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  return 'info' as const;
};

const INVENTORY_PAGE_SIZE = 40;
const PO_PAGE_SIZE = 20;
const LOW_STOCK_THRESHOLD = 20;
const INVENTORY_GRID_TEMPLATE = 'minmax(320px,2.4fr) minmax(140px,1fr) minmax(130px,0.9fr) minmax(160px,1fr) minmax(220px,1.2fr)';
const makeDefaultMeta = (pageSize: number): PaginationMeta => ({
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
});

type PurchaseOrderDraftRowProps = {
  index: number;
  item: DraftItem;
  canRemove: boolean;
  variantOptions: VariantOption[];
  selectedVariantLabel?: string;
  modalFieldClass: string;
  modalFieldLabelClass: string;
  chooseVariantLabel: string;
  itemRowLabel: string;
  variantLabelText: string;
  qtyLabelText: string;
  costLabelText: string;
  removeItemLabel: string;
  onUpdateItem: (idx: number, patch: Partial<DraftItem>) => void;
  onRemoveItem: (idx: number) => void;
};

const PurchaseOrderDraftRow = React.memo(({
  index,
  item,
  canRemove,
  variantOptions,
  selectedVariantLabel,
  modalFieldClass,
  modalFieldLabelClass,
  chooseVariantLabel,
  itemRowLabel,
  variantLabelText,
  qtyLabelText,
  costLabelText,
  removeItemLabel,
  onUpdateItem,
  onRemoveItem,
}: PurchaseOrderDraftRowProps) => {
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const expandOptions = useCallback(() => {
    setOptionsExpanded(true);
  }, []);

  const handleVariantChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateItem(index, { variantId: e.target.value === '' ? '' : Number(e.target.value) });
  }, [index, onUpdateItem]);

  const handleOrderedQtyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateItem(index, { orderedQty: Math.max(1, Number(e.target.value) || 1) });
  }, [index, onUpdateItem]);

  const handleUnitCostChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateItem(index, { unitCost: Math.max(1, Number(e.target.value) || 1) });
  }, [index, onUpdateItem]);

  const handleRemove = useCallback(() => {
    onRemoveItem(index);
  }, [index, onRemoveItem]);

  const selectOptions = useMemo(() => {
    const options = [<option key="placeholder" value="">{chooseVariantLabel}</option>];

    if (optionsExpanded) {
      options.push(...variantOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      )));
      return options;
    }

    if (item.variantId !== '' && selectedVariantLabel) {
      options.push(<option key={item.variantId} value={item.variantId}>{selectedVariantLabel}</option>);
    }

    return options;
  }, [chooseVariantLabel, item.variantId, optionsExpanded, selectedVariantLabel, variantOptions]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">{itemRowLabel}</p>
        <button onClick={handleRemove} disabled={!canRemove} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 disabled:opacity-40"><X size={14} />{removeItemLabel}</button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-start">
        <div className="space-y-1.5 md:col-span-7">
          <label className={modalFieldLabelClass}>{variantLabelText}</label>
          <select
            value={item.variantId}
            onChange={handleVariantChange}
            onFocus={expandOptions}
            onPointerDown={expandOptions}
            className={modalFieldClass}
          >
            {selectOptions}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className={modalFieldLabelClass}>{qtyLabelText}</label>
          <input type="number" min={1} step={1} value={item.orderedQty} onChange={handleOrderedQtyChange} className={modalFieldClass} />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <label className={modalFieldLabelClass}>{costLabelText}</label>
          <input type="number" min={1} step="0.01" value={item.unitCost} onChange={handleUnitCostChange} className={modalFieldClass} />
        </div>
      </div>
    </div>
  );
});

PurchaseOrderDraftRow.displayName = 'PurchaseOrderDraftRow';

export const Restock: React.FC = () => {
  const { t } = useTranslation();
  const tt = t as (key: string, opts?: Record<string, unknown>) => string;
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const initialInventorySearch = searchParams.get('search')?.trim() ?? '';
  const initialFocusedVariantId = Number.parseInt(searchParams.get('variantId') ?? '', 10);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [allVariants, setAllVariants] = useState<InventoryVariant[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [fetchingInventory, setFetchingInventory] = useState(false);
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(true);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({ total: 0, out: 0, low: 0, ok: 0 });
  const [error, setError] = useState<string | null>(null);

  const [poSearch, setPoSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState(initialInventorySearch);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);
  const [poPage, setPoPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [poMeta, setPoMeta] = useState<PaginationMeta>(() => makeDefaultMeta(PO_PAGE_SIZE));
  const [inventoryMeta, setInventoryMeta] = useState<PaginationMeta>(() => makeDefaultMeta(INVENTORY_PAGE_SIZE));
  const debouncedPoSearch = useDebouncedValue(poSearch, 350);
  const debouncedInventorySearch = useDebouncedValue(inventorySearch, 300);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ variantId: '', orderedQty: 1, unitCost: 1 }]);
  const [supplier, setSupplier] = useState('');
  const [expectedReceivedAt, setExpectedReceivedAt] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierContactName, setSupplierContactName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingMap, setReceivingMap] = useState<ReceiveMap>({});
  const [receivingNote, setReceivingNote] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<PurchaseOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const poRequestIdRef = useRef(0);
  const inventoryRequestIdRef = useRef(0);
  const summaryRequestIdRef = useRef(0);
  const inventoryScrollRef = useRef<HTMLDivElement | null>(null);
  const variantOptionsLoadingRef = useRef(false);
  const [focusedVariantId, setFocusedVariantId] = useState<number | null>(
    Number.isInteger(initialFocusedVariantId) && initialFocusedVariantId > 0 ? initialFocusedVariantId : null,
  );
  const minExpectedReceivedAt = useMemo(() => getCurrentDateTimeLocal(), [showCreate]);

  const isLowStockQuantity = useCallback(
    (qty: number) => qty > 0 && qty <= LOW_STOCK_THRESHOLD,
    [],
  );

  useEffect(() => {
    const nextSearch = searchParams.get('search')?.trim() ?? '';
    const nextFocusedVariantId = Number.parseInt(searchParams.get('variantId') ?? '', 10);

    setInventorySearch((current) => (current === nextSearch ? current : nextSearch));
    setFocusedVariantId(
      Number.isInteger(nextFocusedVariantId) && nextFocusedVariantId > 0 ? nextFocusedVariantId : null,
    );
    setInventoryPage(1);
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    const requestId = ++poRequestIdRef.current;
    setLoadingOrders(true);
    setError(null);
    try {
      const res = await listPurchaseOrders({
        page: poPage,
        pageSize: PO_PAGE_SIZE,
        search: debouncedPoSearch || undefined,
      });
      if (poRequestIdRef.current !== requestId) return;
      setOrders(res.data ?? []);
      setPoMeta(res.meta ?? makeDefaultMeta(PO_PAGE_SIZE));
    } catch (e) {
      if (poRequestIdRef.current !== requestId) return;
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.loadOrders'));
    } finally {
      if (poRequestIdRef.current === requestId) {
        setLoadingOrders(false);
      }
    }
  }, [debouncedPoSearch, poPage, tt]);

  const loadInventory = useCallback(async () => {
    const requestId = ++inventoryRequestIdRef.current;
    const showInitialLoading = variants.length === 0;
    if (showInitialLoading) setLoadingInventory(true);
    setFetchingInventory(true);
    try {
      const lowStockServerFilter = showLowStockOnly || showOutOfStockOnly;
      const res = await fetchInventoryPage(
        {
          search: debouncedInventorySearch || undefined,
          lowStock: lowStockServerFilter || undefined,
        },
        inventoryPage,
        INVENTORY_PAGE_SIZE,
      );
      if (inventoryRequestIdRef.current !== requestId) return;

      let rows = res.data;
      if (showOutOfStockOnly && !showLowStockOnly) {
        rows = rows.filter((v) => v.stockQuantity <= 0);
      } else if (showLowStockOnly && !showOutOfStockOnly) {
        rows = rows.filter((v) => isLowStockQuantity(v.stockQuantity));
      }

      setVariants(rows);
      setInventoryMeta(res.meta ?? makeDefaultMeta(INVENTORY_PAGE_SIZE));
    } catch (e) {
      if (inventoryRequestIdRef.current !== requestId) return;
      const err = e as Error;
      setError(err.message || tt('feedback.loadError'));
    } finally {
      if (inventoryRequestIdRef.current === requestId) {
        setLoadingInventory(false);
        setFetchingInventory(false);
      }
    }
  }, [debouncedInventorySearch, inventoryPage, isLowStockQuantity, showLowStockOnly, showOutOfStockOnly, tt, variants.length]);

  const loadInventorySummary = useCallback(async () => {
    const requestId = ++summaryRequestIdRef.current;
    setLoadingInventorySummary(true);
    try {
      const summary = await fetchInventorySummary();
      if (summaryRequestIdRef.current !== requestId) return;
      const data = summary.data;
      setInventorySummary({
        total: Number(data?.totalVariants ?? 0),
        out: Number(data?.outOfStock ?? 0),
        low: Number(data?.lowStock ?? 0),
        ok: Math.max(
          0,
          Number(data?.totalVariants ?? 0) - Number(data?.outOfStock ?? 0) - Number(data?.lowStock ?? 0),
        ),
      });
    } catch {
      if (summaryRequestIdRef.current !== requestId) return;
      // Keep current summary when background aggregation fails.
    } finally {
      if (summaryRequestIdRef.current === requestId) {
        setLoadingInventorySummary(false);
      }
    }
  }, []);

  const loadVariantOptions = useCallback(async () => {
    if (allVariants.length || variantOptionsLoadingRef.current) return;
    variantOptionsLoadingRef.current = true;
    try {
      const data = await fetchAllInventory({});
      setAllVariants(data);
    } finally {
      variantOptionsLoadingRef.current = false;
    }
  }, [allVariants.length]);

  const openCreateModal = useCallback(() => {
    setShowCreate(true);
    void loadVariantOptions();
  }, [loadVariantOptions]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);
  useEffect(() => {
    void loadInventorySummary();
  }, [loadInventorySummary]);

  const variantSource = allVariants.length ? allVariants : variants;
  const variantOptions = useMemo(
    (): VariantOption[] => variantSource.map((v) => ({ value: v.variantId, label: `${v.product.name} ${v.variantLabel ? `(${v.variantLabel})` : ''} - ${v.sku}` })),
    [variantSource],
  );
  const variantLabelById = useMemo(
    () => new Map(variantOptions.map((option) => [option.value, option.label])),
    [variantOptions],
  );

  const inventoryStatusMeta = useMemo(
    () => ({
      out: { label: tt('restock:po.inventory.statuses.out'), note: tt('restock:po.inventory.messages.out'), cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
      low: { label: tt('restock:po.inventory.statuses.low'), note: tt('restock:po.inventory.messages.low'), cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      ok: { label: tt('restock:po.inventory.statuses.ok'), note: tt('restock:po.inventory.messages.ok'), cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    }),
    [tt],
  );

  const inventoryCanPrev = inventoryPage > 1;
  const inventoryCanNext = inventoryPage < Math.max(1, inventoryMeta.totalPages);
  const poCanPrev = poPage > 1;
  const poCanNext = poPage < Math.max(1, poMeta.totalPages);

  const addItem = useCallback(() => {
    setDraftItems((prev) => [...prev, { variantId: '', orderedQty: 1, unitCost: 1 }]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateItem = useCallback((idx: number, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }, []);

  const resetCreate = () => {
    setSupplier('');
    setExpectedReceivedAt('');
    setInvoiceNumber('');
    setSupplierContactName('');
    setSupplierPhone('');
    setSupplierEmail('');
    setNotes('');
    setDraftItems([{ variantId: '', orderedQty: 1, unitCost: 1 }]);
  };

  const hasSelectedDraftVariant = (item: DraftItem) => item.variantId !== '';
  const hasInvalidDraftOrderedQty = (item: DraftItem) =>
    hasSelectedDraftVariant(item) && !isPositiveInteger(item.orderedQty);
  const hasInvalidDraftUnitCost = (item: DraftItem) =>
    hasSelectedDraftVariant(item) && !isPositiveFiniteNumber(item.unitCost);

  const handleCreate = async () => {
    if (!supplier.trim()) return setError(tt('restock:po.errors.supplierRequired'));

    if (expectedReceivedAt) {
      const selectedExpected = new Date(expectedReceivedAt);
      const minimumExpected = new Date(minExpectedReceivedAt);
      if (Number.isNaN(selectedExpected.getTime()) || selectedExpected < minimumExpected) {
        return setError(tt('restock:po.errors.expectedDatePast'));
      }
    }

    const hasInvalidOrderedQty = draftItems.some(hasInvalidDraftOrderedQty);
    if (hasInvalidOrderedQty) return setError(tt('restock:po.errors.invalidOrderedQty'));

    const hasInvalidUnitCost = draftItems.some(hasInvalidDraftUnitCost);
    if (hasInvalidUnitCost) return setError(tt('restock:po.errors.invalidUnitCost'));

    const items = draftItems
      .filter((i) => i.variantId !== '' && i.orderedQty > 0 && i.unitCost > 0)
      .map((i) => ({ variantId: Number(i.variantId), orderedQty: i.orderedQty, unitCost: i.unitCost }));
    if (!items.length) return setError(tt('restock:po.errors.itemsRequired'));

    setCreating(true);
    setError(null);
    try {
      await createPurchaseOrder({
        supplier: supplier.trim(),
        expectedReceivedAt: expectedReceivedAt ? new Date(expectedReceivedAt).toISOString() : null,
        invoiceNumber: invoiceNumber || null,
        supplierContactName: supplierContactName || null,
        supplierPhone: supplierPhone || null,
        supplierEmail: supplierEmail || null,
        notes: notes || null,
        items,
      });
      setShowCreate(false);
      resetCreate();
      await Promise.all([loadOrders(), loadInventory(), loadInventorySummary()]);
      await queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    } catch (e) {
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const openReceive = (order: PurchaseOrder) => {
    const map: ReceiveMap = {};
    order.items.forEach((i) => { map[i.purchaseOrderItemId] = 0; });
    setReceivingMap(map);
    setReceivingNote('');
    setReceivingOrder(order);
  };

  const handleReceive = useCallback(async () => {
    if (!receivingOrder) return;
    const items = receivingOrder.items
      .map((i) => ({ purchaseOrderItemId: i.purchaseOrderItemId, quantity: Number(receivingMap[i.purchaseOrderItemId] || 0) }))
      .filter((i) => i.quantity > 0);
    if (!items.length) return setError(tt('restock:po.errors.receiptItemsRequired'));

    setReceiving(true);
    setError(null);
    try {
      await receivePurchaseOrder(receivingOrder.purchaseOrderId, { items, notes: receivingNote || null });
      setReceivingOrder(null);
      setReceivingMap({});
      setReceivingNote('');
      await Promise.all([loadOrders(), loadInventory(), loadInventorySummary()]);
      await queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
    } catch (e) {
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.receiveFailed'));
    } finally {
      setReceiving(false);
    }
  }, [loadInventory, loadInventorySummary, loadOrders, queryClient, receivingMap, receivingNote, receivingOrder, tt]);

  const handleCancel = async () => {
    if (!cancellingOrder) return;
    setCancelling(true);
    try {
      await cancelPurchaseOrder(cancellingOrder.purchaseOrderId);
      setCancellingOrder(null);
      await loadOrders();
    } catch (e) {
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  const renderInventoryStatus = useCallback(
    (qty: number) => {
      if (qty <= 0) return inventoryStatusMeta.out;
      if (qty <= LOW_STOCK_THRESHOLD) return inventoryStatusMeta.low;
      return inventoryStatusMeta.ok;
    },
    [inventoryStatusMeta],
  );

  const handleRefresh = useCallback(() => {
    void Promise.all([
      loadOrders(),
      loadInventory(),
      loadInventorySummary(),
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] }),
    ]);
  }, [loadOrders, loadInventory, loadInventorySummary, queryClient]);

  const changeInventoryPage = useCallback((nextPage: number) => {
    if (nextPage === inventoryPage) return;
    if (inventoryScrollRef.current) {
      inventoryScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setInventoryPage(nextPage);
  }, [inventoryPage]);

  const summaryCards = [
    {
      key: 'total',
      label: tt('restock:po.inventory.stats.total'),
      value: loadingInventorySummary ? '-' : inventorySummary.total || inventoryMeta.total,
      tone: 'default' as const,
    },
    {
      key: 'out',
      label: tt('restock:po.inventory.stats.out'),
      value: loadingInventorySummary ? '-' : inventorySummary.out,
      tone: 'danger' as const,
    },
    {
      key: 'low',
      label: tt('restock:po.inventory.stats.low'),
      value: loadingInventorySummary ? '-' : inventorySummary.low,
      tone: 'warning' as const,
    },
    {
      key: 'ok',
      label: tt('restock:po.inventory.stats.ok'),
      value: loadingInventorySummary ? '-' : inventorySummary.ok,
      tone: 'success' as const,
    },
  ];

  const modalFieldClass = `${adminUiTokens.fieldControl} rounded-lg bg-black/20`;
  const modalTextareaClass = `${adminUiTokens.fieldControl} rounded-lg bg-black/20 min-h-[80px]`;
  const modalFieldLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52';
  const createModalLabels = useMemo(
    () => ({
      chooseVariant: tt('restock:po.create.chooseVariant'),
      variant: tt('restock:po.create.variantLabel'),
      qty: tt('restock:po.create.qtyLabel'),
      cost: tt('restock:po.create.costLabel'),
      removeItem: tt('restock:po.create.removeItem'),
    }),
    [tt],
  );

  return (
    <AdminPageShell className="max-w-[1400px] h-auto min-h-full pb-6">
      <AdminPageHeader
        title={tt('restock:po.title')}
        subtitle={tt('restock:po.subtitle')}
        actions={(
          <>
            <AdminSecondaryButton onClick={handleRefresh}>
              <RefreshCw size={14} />{tt('restock:po.actions.refresh')}
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={openCreateModal}>
              <Plus size={14} />{tt('restock:po.actions.newPo')}
            </AdminPrimaryButton>
          </>
        )}
      />

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-200 hover:text-white"><X size={14} /></button>
        </div>
      )}

      <AdminStatCards items={summaryCards} />

      <AdminSectionCard
        title={tt('restock:po.inventory.title')}
        subtitle={tt('restock:po.inventory.subtitle')}
        bodyClassName="min-h-0"
      >
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <AdminToolbar>
            <input
              type="text"
              value={inventorySearch}
              onChange={(e) => {
                setInventorySearch(e.target.value);
                setInventoryPage(1);
              }}
              placeholder={tt('restock:po.inventory.searchPlaceholder')}
              className={`w-full md:w-[440px] ${adminUiTokens.fieldControl} placeholder:text-white/40`}
            />
            <button
              type="button"
              onClick={() => {
                setShowLowStockOnly((prev) => !prev);
                setInventoryPage(1);
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                showLowStockOnly
                  ? 'border-amber-400/40 bg-amber-500/20 text-amber-300'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white'
              }`}
            >
              {tt('restock:po.inventory.stats.low')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOutOfStockOnly((prev) => !prev);
                setInventoryPage(1);
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                showOutOfStockOnly
                  ? 'border-red-400/40 bg-red-500/20 text-red-300'
                  : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white'
              }`}
            >
              {tt('restock:po.inventory.stats.out')}
            </button>
            <p className="text-xs text-white/40">{tt('restock:po.inventory.resultSummary', { shown: variants.length, total: inventoryMeta.total })}</p>
            <div className="ml-auto flex items-center gap-2">
              <AdminIconButton
                type="button"
                onClick={() => changeInventoryPage(Math.max(1, inventoryPage - 1))}
                disabled={!inventoryCanPrev || fetchingInventory}
                aria-label={tt('restock:po.pagination.previousInventory')}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft size={14} />
              </AdminIconButton>
              <span className="min-w-[76px] text-center text-xs text-white/50">
                {inventoryMeta.page}/{Math.max(1, inventoryMeta.totalPages)}
              </span>
              <AdminIconButton
                type="button"
                onClick={() => changeInventoryPage(Math.min(inventoryMeta.totalPages, inventoryPage + 1))}
                disabled={!inventoryCanNext || fetchingInventory}
                aria-label={tt('restock:po.pagination.nextInventory')}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight size={14} />
              </AdminIconButton>
            </div>
          </AdminToolbar>
        </div>
        <div className="grid items-center px-4 py-3 border-b border-white/10 bg-[#161616] text-white/60 uppercase text-[11px] tracking-wider"
          style={{ gridTemplateColumns: INVENTORY_GRID_TEMPLATE }}
        >
          <div className="text-left">{tt('restock:po.inventory.columns.product')}</div>
          <div className="text-center">{tt('restock:po.inventory.columns.sku')}</div>
          <div className="text-center">{tt('restock:po.inventory.columns.qty')}</div>
          <div className="text-center">{tt('restock:po.inventory.columns.status')}</div>
          <div className="text-center">{tt('restock:po.inventory.columns.message')}</div>
        </div>
        <div
          ref={inventoryScrollRef}
          className={`relative isolate overflow-auto transition-opacity ${fetchingInventory ? 'opacity-95' : 'opacity-100'}`}
          style={{ maxHeight: 'min(420px, 40vh)' }}
        >
          {loadingInventory && variants.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/40">{tt('restock:po.inventory.states.loading')}</div>
          ) : variants.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/30">
              {(inventorySearch || showLowStockOnly || showOutOfStockOnly) ? tt('restock:po.inventory.states.noMatch') : tt('restock:po.inventory.states.empty')}
            </div>
          ) : (
            <div className="w-full">
              {variants.map((v) => {
                const s = renderInventoryStatus(v.stockQuantity);
                const isFocused = focusedVariantId === v.variantId;

                return (
                  <div
                    key={v.variantId}
                    className={`w-full border-b border-white/5 hover:bg-white/[0.03] ${isFocused ? 'bg-amber-500/[0.08]' : ''}`}
                  >
                    <div
                      className={`grid min-h-[76px] items-center px-4 py-3 text-sm ${isFocused ? 'ring-1 ring-inset ring-amber-400/40' : ''}`}
                      style={{ gridTemplateColumns: INVENTORY_GRID_TEMPLATE }}
                    >
                      <div className="flex items-center gap-3">
                        {v.product.primaryImageUrl ? (
                          <img
                            src={v.product.primaryImageUrl}
                            alt={v.product.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-md object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md border border-white/10 bg-white/[0.04] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-white truncate">{v.product.name}</div>
                          <div className="text-white/50 text-xs truncate">{v.variantLabel || tt('restock:table.default')}</div>
                        </div>
                      </div>
                      <div className="text-center text-white/70 font-mono text-xs">{v.sku}</div>
                      <div className="text-center text-white font-semibold">{v.stockQuantity}</div>
                      <div className="text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${s.cls}`}>{s.label}</span>
                      </div>
                      <div className="text-center text-white/70">{s.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminSectionCard>

      <AdminSectionCard bodyClassName="min-h-0">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <AdminToolbar>
            <input
              type="text"
              value={poSearch}
              onChange={(e) => {
                setPoSearch(e.target.value);
                setPoPage(1);
              }}
              placeholder={tt('restock:po.filters.searchPlaceholder')}
              className={`w-full md:w-[460px] ${adminUiTokens.fieldControl} placeholder:text-white/40`}
            />
            <p className="text-xs text-white/40">{poMeta.total} PO</p>
            <div className="ml-auto flex items-center gap-2">
              <AdminIconButton
                type="button"
                onClick={() => setPoPage((prev) => Math.max(1, prev - 1))}
                disabled={!poCanPrev || loadingOrders}
                aria-label={tt('restock:po.pagination.previousPo')}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft size={14} />
              </AdminIconButton>
              <span className="min-w-[76px] text-center text-xs text-white/50">
                {poMeta.page}/{Math.max(1, poMeta.totalPages)}
              </span>
              <AdminIconButton
                type="button"
                onClick={() => setPoPage((prev) => Math.min(poMeta.totalPages, prev + 1))}
                disabled={!poCanNext || loadingOrders}
                aria-label={tt('restock:po.pagination.nextPo')}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight size={14} />
              </AdminIconButton>
            </div>
          </AdminToolbar>
        </div>
        <div
          className="overflow-auto"
          style={{ maxHeight: 'min(420px, 34vh)' }}
        >
          <table className="w-full text-sm">
            <thead className={adminUiTokens.tableHeaderSurface}>
              <tr>
                <th className={`px-4 py-3 text-left ${adminUiTokens.tableHeader}`}>PO</th>
                <th className={`px-4 py-3 text-left ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.supplier')}</th>
                <th className={`px-4 py-3 text-center ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.expected')}</th>
                <th className={`px-4 py-3 text-center ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.status')}</th>
                <th className={`px-4 py-3 text-center ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.qty')}</th>
                <th className={`px-4 py-3 text-center ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.cost')}</th>
                <th className={`px-4 py-3 text-center ${adminUiTokens.tableHeader}`}>{tt('restock:po.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className={adminUiTokens.tableBody}>
              {loadingOrders ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">{tt('restock:po.states.loading')}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-white/30">{tt('restock:po.states.empty')}</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.purchaseOrderId} className={adminUiTokens.tableRowSoft}>
                    <td className="px-4 py-3"><div className="font-semibold text-white">{o.purchaseOrderNumber}</div><div className="text-white/40 text-xs">{formatDate(o.orderedAt)}</div></td>
                    <td className="px-4 py-3"><div className="text-white">{o.supplier}</div><div className="text-white/50 text-xs">{o.invoiceNumber || '-'}</div></td>
                    <td className="px-4 py-3 text-center text-white/70">{formatDate(o.expectedReceivedAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <AdminBadge tone={getStatusBadgeTone(o.status)} className="px-2 py-1 text-xs font-semibold">
                        {tt(`restock:po.statusOptions.${o.status}`)}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3 text-center text-white">{o.totals.receivedQty}/{o.totals.orderedQty}</td>
                    <td className="px-4 py-3 text-center text-white">{o.totals.totalCost.toLocaleString('vi-VN')} d</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <AdminActionButton onClick={() => setViewingOrder(o)}>
                          <Eye size={12} />{tt('restock:po.actions.view')}
                        </AdminActionButton>
                        {(o.status === 'PENDING' || o.status === 'PARTIALLY_RECEIVED') && (
                          <AdminActionButton onClick={() => openReceive(o)} tone="info">
                            <Truck size={12} />{tt('restock:po.actions.receive')}
                          </AdminActionButton>
                        )}
                        {(o.status === 'PENDING' || o.status === 'PARTIALLY_RECEIVED') && (
                          <AdminActionButton onClick={() => setCancellingOrder(o)} tone="danger">
                            <Ban size={12} />{tt('restock:po.actions.cancelPo')}
                          </AdminActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>
      {showCreate && (
        <AdminModalShell
          title={tt('restock:po.create.title')}
          onClose={() => {
            setShowCreate(false);
            resetCreate();
          }}
          align="center"
          maxWidthClassName="max-w-6xl"
          bodyClassName="space-y-6 p-6"
          footer={(
            <div className="flex justify-end gap-3">
              <AdminSecondaryButton
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
                className="rounded-lg px-4 py-2"
              >
                {tt('restock:po.actions.close')}
              </AdminSecondaryButton>
              <AdminPrimaryButton onClick={handleCreate} disabled={creating} className="min-w-[136px]">
                {creating ? tt('restock:po.states.creating') : tt('restock:po.actions.create')}
              </AdminPrimaryButton>
            </div>
          )}
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white">{tt('restock:po.create.sectionInfo')}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.supplier')}</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.supplier')}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.expected')}</label>
                  <input
                    type="datetime-local"
                    value={expectedReceivedAt}
                    onChange={(e) => setExpectedReceivedAt(e.target.value)}
                    min={minExpectedReceivedAt}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.invoice')}</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.invoice')}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.contactName')}</label>
                  <input
                    type="text"
                    value={supplierContactName}
                    onChange={(e) => setSupplierContactName(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.contactName')}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.phone')}</label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.phone')}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.email')}</label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.email')}
                    className={modalFieldClass}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={modalFieldLabelClass}>{tt('restock:po.create.notes')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={tt('restock:po.create.placeholders.notes')}
                    className={modalTextareaClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-semibold text-white">{tt('restock:po.create.sectionItems')}</h3>
                <AdminSecondaryButton type="button" onClick={addItem} className="rounded-lg px-4 py-2">
                  {tt('restock:po.create.addItem')}
                </AdminSecondaryButton>
              </div>
              <div className="space-y-3">
                {draftItems.map((item, index) => (
                  <PurchaseOrderDraftRow
                    key={`draft-item-${index}`}
                    index={index}
                    item={item}
                    canRemove={draftItems.length > 1}
                    variantOptions={variantOptions}
                    selectedVariantLabel={item.variantId === '' ? undefined : variantLabelById.get(Number(item.variantId))}
                    modalFieldClass={modalFieldClass}
                    modalFieldLabelClass={modalFieldLabelClass}
                    chooseVariantLabel={createModalLabels.chooseVariant}
                    itemRowLabel={tt('restock:po.create.itemRow', { index: index + 1 })}
                    variantLabelText={createModalLabels.variant}
                    qtyLabelText={createModalLabels.qty}
                    costLabelText={createModalLabels.cost}
                    removeItemLabel={createModalLabels.removeItem}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                  />
                ))}
              </div>
            </div>
          </div>
        </AdminModalShell>
      )}

      {cancellingOrder && (
        <AdminModalShell
          title={tt('restock:po.cancel.title')}
          subtitle={cancellingOrder.purchaseOrderNumber}
          onClose={() => {
            if (cancelling) return;
            setCancellingOrder(null);
          }}
          maxWidthClassName="max-w-md"
          bodyClassName="space-y-4 p-6"
          footer={(
            <div className="flex justify-end gap-3">
              <AdminSecondaryButton
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={cancelling}
                className="rounded-lg px-4 py-2"
              >
                {tt('restock:po.actions.close')}
              </AdminSecondaryButton>
              <AdminActionButton
                onClick={handleCancel}
                disabled={cancelling}
                tone="danger"
                size="md"
                className="min-w-[136px]"
              >
                {cancelling ? tt('restock:po.states.cancelling') : tt('restock:po.actions.cancelPo')}
              </AdminActionButton>
            </div>
          )}
        >
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-white/80">
            <p>{tt('restock:po.actions.cancelConfirm', { po: cancellingOrder.purchaseOrderNumber })}</p>
            <p className="mt-2 text-xs text-white/50">{tt('restock:po.cancel.description')}</p>
          </div>
        </AdminModalShell>
      )}

      {receivingOrder && (
        <AdminModalShell
          title={`${tt('restock:po.receive.title')} ${receivingOrder.purchaseOrderNumber}`}
          onClose={() => setReceivingOrder(null)}
          align="start"
          maxWidthClassName="max-w-3xl"
          bodyClassName="space-y-5 p-6"
          footer={(
            <div className="flex justify-end gap-3">
              <AdminSecondaryButton type="button" onClick={() => setReceivingOrder(null)} className="rounded-lg px-4 py-2">{tt('restock:po.actions.close')}</AdminSecondaryButton>
              <AdminActionButton onClick={handleReceive} disabled={receiving} tone="info" size="md" className="min-w-[136px]">
                {receiving ? tt('restock:po.states.receiving') : tt('restock:po.actions.confirmReceive')}
              </AdminActionButton>
            </div>
          )}
        >
            <div className="space-y-2">
              {receivingOrder.items.map((i) => (
                <div key={i.purchaseOrderItemId} className="grid grid-cols-12 gap-2 items-center bg-black/20 border border-white/10 rounded-lg p-2">
                  <div className="col-span-6 text-white text-sm"><div>{i.productName || '-'}</div><div className="text-white/50 text-xs">{i.sku || '-'}</div></div>
                  <div className="col-span-3 text-white/60 text-xs">{i.receivedQty}/{i.orderedQty} ({tt('restock:po.receive.remaining')}: {i.remainingQty})</div>
                  <input type="number" min={0} max={i.remainingQty} value={receivingMap[i.purchaseOrderItemId] ?? 0} onChange={(e) => setReceivingMap((p) => ({ ...p, [i.purchaseOrderItemId]: Math.max(0, Math.min(i.remainingQty, Number(e.target.value) || 0)) }))} className={`col-span-3 ${modalFieldClass}`} />
                </div>
              ))}
            </div>
            <textarea value={receivingNote} onChange={(e) => setReceivingNote(e.target.value)} placeholder={tt('restock:po.receive.note')} className={`${modalTextareaClass} min-h-[72px]`} />
        </AdminModalShell>
      )}

      {viewingOrder && (
        <AdminModalShell
          title={`${tt('restock:po.view.title')} ${viewingOrder.purchaseOrderNumber}`}
          onClose={() => setViewingOrder(null)}
          align="start"
          maxWidthClassName="max-w-3xl"
          bodyClassName="space-y-5 p-6"
          footer={(
            <div className="flex justify-end">
              <AdminSecondaryButton type="button" onClick={() => setViewingOrder(null)} className="rounded-lg px-4 py-2">{tt('restock:po.actions.close')}</AdminSecondaryButton>
            </div>
          )}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-black/20 border border-white/10 rounded-lg p-3"><p className="text-white/40 text-xs">{tt('restock:po.columns.supplier')}</p><p className="text-white mt-1">{viewingOrder.supplier}</p></div>
              <div className="bg-black/20 border border-white/10 rounded-lg p-3"><p className="text-white/40 text-xs">{tt('restock:po.columns.status')}</p><p className="text-white mt-1">{tt(`restock:po.statusOptions.${viewingOrder.status}`)}</p></div>
              <div className="bg-black/20 border border-white/10 rounded-lg p-3"><p className="text-white/40 text-xs">{tt('restock:po.columns.expected')}</p><p className="text-white mt-1">{formatDate(viewingOrder.expectedReceivedAt)}</p></div>
              <div className="bg-black/20 border border-white/10 rounded-lg p-3"><p className="text-white/40 text-xs">{tt('restock:po.create.invoice')}</p><p className="text-white mt-1">{viewingOrder.invoiceNumber || '-'}</p></div>
            </div>
            <div className="space-y-2">
              {viewingOrder.items.map((i) => (
                <div key={i.purchaseOrderItemId} className="grid grid-cols-12 gap-2 items-center bg-black/20 border border-white/10 rounded-lg p-2">
                  <div className="col-span-6 text-white text-sm"><div>{i.productName || '-'}</div><div className="text-white/50 text-xs">{i.sku || '-'}</div></div>
                  <div className="col-span-3 text-white/70 text-xs">{tt('restock:po.view.ordered')}: {i.orderedQty}</div>
                  <div className="col-span-3 text-white/70 text-xs">{tt('restock:po.view.received')}: {i.receivedQty}</div>
                </div>
              ))}
            </div>
        </AdminModalShell>
      )}
    </AdminPageShell>
  );
};

