import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, ChevronLeft, ChevronRight, Eye, Plus, RefreshCw, Truck, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

const getStatusClass = (status: PurchaseOrderStatus) => {
  if (status === 'RECEIVED') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'PARTIALLY_RECEIVED') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (status === 'CANCELLED') return 'bg-red-500/15 text-red-300 border-red-500/30';
  return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
};

const INVENTORY_PAGE_SIZE = 40;
const PO_PAGE_SIZE = 20;
const INVENTORY_ROW_HEIGHT = 76;
const INVENTORY_GRID_TEMPLATE = 'minmax(320px,2.4fr) minmax(140px,1fr) minmax(130px,0.9fr) minmax(160px,1fr) minmax(220px,1.2fr)';
const makeDefaultMeta = (pageSize: number): PaginationMeta => ({
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
});

export const Restock: React.FC = () => {
  const { t } = useTranslation();
  const tt = t as (key: string, opts?: Record<string, unknown>) => string;

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
  const [inventorySearch, setInventorySearch] = useState('');
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
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ variantId: '', orderedQty: 1, unitCost: 0 }]);
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

  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const poRequestIdRef = useRef(0);
  const inventoryRequestIdRef = useRef(0);
  const summaryRequestIdRef = useRef(0);
  const inventoryScrollRef = useRef<HTMLDivElement | null>(null);
  const variantOptionsLoadingRef = useRef(false);

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
        rows = rows.filter((v) => v.stockQuantity > 0 && v.stockQuantity < 10);
      }

      setVariants(rows);
      setInventoryMeta(res.meta ?? makeDefaultMeta(INVENTORY_PAGE_SIZE));
      if (inventoryScrollRef.current) {
        inventoryScrollRef.current.scrollTop = 0;
      }
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
  }, [debouncedInventorySearch, inventoryPage, showLowStockOnly, showOutOfStockOnly, tt, variants.length]);

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
    () => variantSource.map((v) => ({ value: v.variantId, label: `${v.product.name} ${v.variantLabel ? `(${v.variantLabel})` : ''} - ${v.sku}` })),
    [variantSource],
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

  const inventoryRowVirtualizer = useVirtualizer({
    count: variants.length,
    getScrollElement: () => inventoryScrollRef.current,
    estimateSize: () => INVENTORY_ROW_HEIGHT,
    overscan: 8,
  });

  const addItem = () => setDraftItems((prev) => [...prev, { variantId: '', orderedQty: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<DraftItem>) => setDraftItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const resetCreate = () => {
    setSupplier('');
    setExpectedReceivedAt('');
    setInvoiceNumber('');
    setSupplierContactName('');
    setSupplierPhone('');
    setSupplierEmail('');
    setNotes('');
    setDraftItems([{ variantId: '', orderedQty: 1, unitCost: 0 }]);
  };

  const handleCreate = async () => {
    if (!supplier.trim()) return setError(tt('restock:po.errors.supplierRequired'));
    const items = draftItems.filter((i) => i.variantId !== '' && i.orderedQty > 0).map((i) => ({ variantId: Number(i.variantId), orderedQty: i.orderedQty, unitCost: i.unitCost }));
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

  const handleReceive = async () => {
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
    } catch (e) {
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.receiveFailed'));
    } finally {
      setReceiving(false);
    }
  };

  const handleCancel = async (order: PurchaseOrder) => {
    if (!window.confirm(tt('restock:po.actions.cancelConfirm', { po: order.purchaseOrderNumber }))) return;
    try {
      await cancelPurchaseOrder(order.purchaseOrderId);
      await loadOrders();
    } catch (e) {
      const err = e as Error;
      setError(err.message || tt('restock:po.errors.cancelFailed'));
    }
  };

  const renderInventoryStatus = useCallback(
    (qty: number) => {
      if (qty <= 0) return inventoryStatusMeta.out;
      if (qty < 10) return inventoryStatusMeta.low;
      return inventoryStatusMeta.ok;
    },
    [inventoryStatusMeta],
  );

  const handleRefresh = useCallback(() => {
    void Promise.all([loadOrders(), loadInventory(), loadInventorySummary()]);
  }, [loadOrders, loadInventory, loadInventorySummary]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{tt('restock:po.title')}</h1>
          <p className="text-sm text-white/50">{tt('restock:po.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition flex items-center gap-2">
            <RefreshCw size={14} />{tt('restock:po.actions.refresh')}
          </button>
          <button onClick={openCreateModal} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-red-700 transition flex items-center gap-2">
            <Plus size={14} />{tt('restock:po.actions.newPo')}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-200 hover:text-white"><X size={14} /></button>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-white/10 rounded-xl px-4 py-3"><p className="text-xs text-white/50">{tt('restock:po.inventory.stats.total')}</p><p className="text-2xl font-bold text-white">{loadingInventorySummary ? '-' : inventorySummary.total || inventoryMeta.total}</p></div>
        <div className="bg-[#111] border border-red-500/20 rounded-xl px-4 py-3"><p className="text-xs text-red-300/70">{tt('restock:po.inventory.stats.out')}</p><p className="text-2xl font-bold text-red-300">{loadingInventorySummary ? '-' : inventorySummary.out}</p></div>
        <div className="bg-[#111] border border-amber-500/20 rounded-xl px-4 py-3"><p className="text-xs text-amber-300/70">{tt('restock:po.inventory.stats.low')}</p><p className="text-2xl font-bold text-amber-300">{loadingInventorySummary ? '-' : inventorySummary.low}</p></div>
        <div className="bg-[#111] border border-emerald-500/20 rounded-xl px-4 py-3"><p className="text-xs text-emerald-300/70">{tt('restock:po.inventory.stats.ok')}</p><p className="text-2xl font-bold text-emerald-300">{loadingInventorySummary ? '-' : inventorySummary.ok}</p></div>
      </section>

      <section className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold">{tt('restock:po.inventory.title')}</h3>
          <p className="text-xs text-white/40">{tt('restock:po.inventory.subtitle')}</p>
        </div>
        <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={inventorySearch}
            onChange={(e) => {
              setInventorySearch(e.target.value);
              setInventoryPage(1);
            }}
            placeholder={tt('restock:po.inventory.searchPlaceholder')}
            className="w-full md:w-[440px] bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40"
          />
          <button
            type="button"
            onClick={() => {
              setShowLowStockOnly((prev) => !prev);
              setInventoryPage(1);
            }}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
              showLowStockOnly
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : 'bg-black/20 border-white/10 text-white/70 hover:text-white hover:border-white/30'
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
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
              showOutOfStockOnly
                ? 'bg-red-500/20 border-red-400/40 text-red-300'
                : 'bg-black/20 border-white/10 text-white/70 hover:text-white hover:border-white/30'
            }`}
          >
            {tt('restock:po.inventory.stats.out')}
          </button>
          <p className="text-xs text-white/40">{tt('restock:po.inventory.resultSummary', { shown: variants.length, total: inventoryMeta.total })}</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
              disabled={!inventoryCanPrev || fetchingInventory}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-white/50 min-w-[76px] text-center">
              {inventoryMeta.page}/{Math.max(1, inventoryMeta.totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setInventoryPage((prev) => Math.min(inventoryMeta.totalPages, prev + 1))}
              disabled={!inventoryCanNext || fetchingInventory}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            {fetchingInventory && <span className="text-[10px] text-white/45">{tt('restock:po.inventory.states.loading')}</span>}
          </div>
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
        <div ref={inventoryScrollRef} className="overflow-auto max-h-[420px] relative isolate">
          {loadingInventory && variants.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/40">{tt('restock:po.inventory.states.loading')}</div>
          ) : variants.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/30">
              {(inventorySearch || showLowStockOnly || showOutOfStockOnly) ? tt('restock:po.inventory.states.noMatch') : tt('restock:po.inventory.states.empty')}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{ height: `${inventoryRowVirtualizer.getTotalSize()}px` }}
            >
              {inventoryRowVirtualizer.getVirtualItems().map((virtualRow) => {
                const v = variants[virtualRow.index];
                if (!v) return null;
                const s = renderInventoryStatus(v.stockQuantity);

                return (
                  <div
                    key={v.variantId}
                    className="absolute left-0 top-0 w-full border-b border-white/5 hover:bg-white/[0.03]"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className="grid h-full items-center px-4 text-sm"
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
      </section>

      <section className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={poSearch}
            onChange={(e) => {
              setPoSearch(e.target.value);
              setPoPage(1);
            }}
            placeholder={tt('restock:po.filters.searchPlaceholder')}
            className="w-full md:w-[460px] bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40"
          />
          <p className="text-xs text-white/40">{poMeta.total} PO</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPoPage((prev) => Math.max(1, prev - 1))}
              disabled={!poCanPrev || loadingOrders}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Trang trước PO"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-white/50 min-w-[76px] text-center">
              {poMeta.page}/{Math.max(1, poMeta.totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPoPage((prev) => Math.min(poMeta.totalPages, prev + 1))}
              disabled={!poCanNext || loadingOrders}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Trang sau PO"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10 text-white/60 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">PO</th>
                <th className="px-4 py-3 text-left">{tt('restock:po.columns.supplier')}</th>
                <th className="px-4 py-3 text-center">{tt('restock:po.columns.expected')}</th>
                <th className="px-4 py-3 text-center">{tt('restock:po.columns.status')}</th>
                <th className="px-4 py-3 text-center">{tt('restock:po.columns.qty')}</th>
                <th className="px-4 py-3 text-center">{tt('restock:po.columns.cost')}</th>
                <th className="px-4 py-3 text-center">{tt('restock:po.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingOrders ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">{tt('restock:po.states.loading')}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-white/30">{tt('restock:po.states.empty')}</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.purchaseOrderId} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{o.purchaseOrderNumber}</div><div className="text-white/40 text-xs">{formatDate(o.orderedAt)}</div></td>
                    <td className="px-4 py-3"><div className="text-white">{o.supplier}</div><div className="text-white/50 text-xs">{o.invoiceNumber || '-'}</div></td>
                    <td className="px-4 py-3 text-center text-white/70">{formatDate(o.expectedReceivedAt)}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${getStatusClass(o.status)}`}>{tt(`restock:po.statusOptions.${o.status}`)}</span></td>
                    <td className="px-4 py-3 text-center text-white">{o.totals.receivedQty}/{o.totals.orderedQty}</td>
                    <td className="px-4 py-3 text-center text-white">{o.totals.totalCost.toLocaleString('vi-VN')} d</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewingOrder(o)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/80 border border-white/15 hover:bg-white/10 transition flex items-center gap-1"><Eye size={12} />{tt('restock:po.actions.view')}</button>
                        {(o.status === 'PENDING' || o.status === 'PARTIALLY_RECEIVED') && <button onClick={() => openReceive(o)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition flex items-center gap-1"><Truck size={12} />{tt('restock:po.actions.receive')}</button>}
                        {(o.status === 'PENDING' || o.status === 'PARTIALLY_RECEIVED') && <button onClick={() => handleCancel(o)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition flex items-center gap-1"><Ban size={12} />{tt('restock:po.actions.cancelPo')}</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {showCreate && (
        <div className="fixed inset-0 z-40 bg-black/70 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{tt('restock:po.create.title')}</h2><button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white"><X size={18} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={tt('restock:po.create.supplier')} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="datetime-local" value={expectedReceivedAt} onChange={(e) => setExpectedReceivedAt(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={tt('restock:po.create.invoice')} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input value={supplierContactName} onChange={(e) => setSupplierContactName(e.target.value)} placeholder={tt('restock:po.create.contactName')} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder={tt('restock:po.create.phone')} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder={tt('restock:po.create.email')} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tt('restock:po.create.notes')} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px]" />
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-white">{tt('restock:po.create.items')}</h3><button onClick={addItem} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white">{tt('restock:po.create.addItem')}</button></div>
              {draftItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <select value={item.variantId} onChange={(e) => updateItem(idx, { variantId: e.target.value === '' ? '' : Number(e.target.value) })} className="md:col-span-7 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">{tt('restock:po.create.chooseVariant')}</option>
                    {variantOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                  <input type="number" min={1} value={item.orderedQty} onChange={(e) => updateItem(idx, { orderedQty: Math.max(1, Number(e.target.value) || 1) })} className="md:col-span-2 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                  <input type="number" min={0} step="0.01" value={item.unitCost} onChange={(e) => updateItem(idx, { unitCost: Math.max(0, Number(e.target.value) || 0) })} className="md:col-span-2 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                  <button onClick={() => removeItem(idx)} disabled={draftItems.length === 1} className="md:col-span-1 px-2 py-2 rounded-lg border border-red-500/30 text-red-300 disabled:opacity-40"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowCreate(false); resetCreate(); }} className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">{tt('restock:po.actions.close')}</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-red-700 disabled:opacity-60">{creating ? tt('restock:po.states.creating') : tt('restock:po.actions.create')}</button>
            </div>
          </div>
        </div>
      )}

      {receivingOrder && (
        <div className="fixed inset-0 z-40 bg-black/70 p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{tt('restock:po.receive.title')} {receivingOrder.purchaseOrderNumber}</h2><button onClick={() => setReceivingOrder(null)} className="text-white/50 hover:text-white"><X size={18} /></button></div>
            <div className="space-y-2">
              {receivingOrder.items.map((i) => (
                <div key={i.purchaseOrderItemId} className="grid grid-cols-12 gap-2 items-center bg-black/20 border border-white/10 rounded-lg p-2">
                  <div className="col-span-6 text-white text-sm"><div>{i.productName || '-'}</div><div className="text-white/50 text-xs">{i.sku || '-'}</div></div>
                  <div className="col-span-3 text-white/60 text-xs">{i.receivedQty}/{i.orderedQty} ({tt('restock:po.receive.remaining')}: {i.remainingQty})</div>
                  <input type="number" min={0} max={i.remainingQty} value={receivingMap[i.purchaseOrderItemId] ?? 0} onChange={(e) => setReceivingMap((p) => ({ ...p, [i.purchaseOrderItemId]: Math.max(0, Math.min(i.remainingQty, Number(e.target.value) || 0)) }))} className="col-span-3 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              ))}
            </div>
            <textarea value={receivingNote} onChange={(e) => setReceivingNote(e.target.value)} placeholder={tt('restock:po.receive.note')} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[72px]" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setReceivingOrder(null)} className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">{tt('restock:po.actions.close')}</button>
              <button onClick={handleReceive} disabled={receiving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">{receiving ? tt('restock:po.states.receiving') : tt('restock:po.actions.confirmReceive')}</button>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <div className="fixed inset-0 z-40 bg-black/70 p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">{tt('restock:po.view.title')} {viewingOrder.purchaseOrderNumber}</h2><button onClick={() => setViewingOrder(null)} className="text-white/50 hover:text-white"><X size={18} /></button></div>
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
            <div className="flex justify-end"><button onClick={() => setViewingOrder(null)} className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">{tt('restock:po.actions.close')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

