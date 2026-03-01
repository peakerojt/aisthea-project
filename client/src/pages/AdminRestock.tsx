/**
 * AdminRestock.tsx — Quản lý Tồn kho & Nhập kho
 * ──────────────────────────────────────────────────────────────────────
 * Enhancements (v2):
 *   • Mandatory "Lý do điều chỉnh" reason field before saving changes
 *   • Save is blocked until a reason is provided
 *   • Per-variant "Lịch sử tồn kho" history slide-over panel
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
   Search,
   PackagePlus,
   Save,
   RefreshCw,
   AlertTriangle,
   CheckCircle2,
   Package,
   X,
   TrendingDown,
   ChevronRight,
   History,
   ChevronLeft,
   ChevronRight as ChevronRightIcon,
   FileText,
} from 'lucide-react';
import {
   fetchInventory,
   bulkUpdateStock,
   fetchInventoryLogs,
   type InventoryVariant,
   type InventoryLogEntry,
} from '../services/inventory.service';

// ─── Reason preset labels ──────────────────────────────────────────────────────
const REASON_PRESETS = [
   'Nhập hàng từ nhà cung cấp',
   'Hàng bị lỗi / trả về',
   'Kiểm kê định kỳ',
   'Điều chỉnh thủ công',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductGroup {
   productId: number;
   productName: string;
   primaryImageUrl: string | null;
   variants: InventoryVariant[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStockStatus = (qty: number): { label: string; className: string } => {
   if (qty === 0) return { label: 'Hết hàng', className: 'bg-red-500/15 text-red-400 border-red-500/25' };
   if (qty < 10) return { label: 'Sắp hết', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' };
   return { label: 'Còn hàng', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
};

const REASON_LABELS: Record<string, { label: string; color: string }> = {
   CHECKOUT: { label: 'Đơn hàng', color: 'text-blue-400' },
   RESTOCK: { label: 'Nhập kho', color: 'text-emerald-400' },
   CANCELLED_RESTORE: { label: 'Huỷ đơn - Hoàn', color: 'text-amber-400' },
   MANUAL_ADJUST: { label: 'Điều chỉnh', color: 'text-purple-400' },
};

function fmtDate(iso: string): string {
   return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
   });
}

function groupVariants(variants: InventoryVariant[]): ProductGroup[] {
   const map = new Map<number, ProductGroup>();
   for (const v of variants) {
      if (!map.has(v.productId)) {
         map.set(v.productId, {
            productId: v.productId,
            productName: v.product.name,
            primaryImageUrl: v.product.primaryImageUrl,
            variants: [],
         });
      }
      map.get(v.productId)!.variants.push(v);
   }
   return Array.from(map.values());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => (
   <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in-up ${type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'
      }`}>
      {type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={18} className="text-red-400 shrink-0" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X size={16} /></button>
   </div>
);

const SkeletonGroup: React.FC = () => (
   <>
      <tr className="bg-white/[0.025] border-b border-white/[0.06]">
         <td colSpan={7} className="px-5 py-3">
            <div className="h-4 w-48 rounded bg-white/[0.07] animate-pulse" />
         </td>
      </tr>
      {[1, 2, 3].map((i) => (
         <tr key={i} className="border-b border-white/[0.04]">
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
               <td key={j} className="px-5 py-4 pl-14">
                  <div className="h-3.5 rounded bg-white/[0.05] animate-pulse" style={{ width: `${55 + j * 7}%` }} />
               </td>
            ))}
         </tr>
      ))}
   </>
);

// ─── Inventory Log Slide-Over ─────────────────────────────────────────────────

interface LogPanelProps {
   variant: InventoryVariant;
   onClose: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ variant, onClose }) => {
   const [logs, setLogs] = useState<InventoryLogEntry[]>([]);
   const [loading, setLoading] = useState(true);
   const [page, setPage] = useState(1);
   const [totalPages, setTotalPages] = useState(1);
   const [total, setTotal] = useState(0);

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const res = await fetchInventoryLogs(variant.variantId, page);
            setLogs(res.items);
            setTotalPages(res.totalPages);
            setTotal(res.total);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, [variant.variantId, page]);

   return (
      <>
         {/* Backdrop */}
         <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
            onClick={onClose}
         />
         {/* Slide-over panel */}
         <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-[#0e0e0e] border-l border-white/[0.08] z-50 flex flex-col shadow-2xl animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
               <div>
                  <div className="flex items-center gap-2 mb-0.5">
                     <History size={16} className="text-primary" />
                     <h2 className="text-sm font-bold text-white">Lịch sử tồn kho</h2>
                  </div>
                  <p className="text-[11px] text-white/40 font-mono">
                     {variant.variantLabel || 'Mặc định'} · {variant.sku}
                  </p>
               </div>
               <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                  <X size={18} />
               </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
               {loading ? (
                  <div className="flex items-center justify-center py-16">
                     <RefreshCw size={20} className="text-white/20 animate-spin" />
                  </div>
               ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                     <FileText size={36} className="text-white/10 mb-3" />
                     <p className="text-white/40 text-sm">Chưa có lịch sử thay đổi tồn kho</p>
                  </div>
               ) : (
                  <div className="divide-y divide-white/[0.04]">
                     {logs.map((log) => {
                        const isPositive = log.changeQuantity > 0;
                        const reasonMeta = REASON_LABELS[log.reason] ?? { label: log.reason, color: 'text-white/50' };
                        return (
                           <div key={log.logId} className="px-6 py-4 hover:bg-white/[0.015] transition-colors">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                 <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.08] ${reasonMeta.color}`}>
                                       {reasonMeta.label}
                                    </span>
                                    {log.orderNumber && (
                                       <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                                          #{log.orderNumber}
                                       </span>
                                    )}
                                 </div>
                                 <span className={`text-base font-black tabular-nums shrink-0 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isPositive ? '+' : ''}{log.changeQuantity}
                                 </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-white/50">
                                 <span>{log.previousStock} → <span className="font-bold text-white/70">{log.newStock}</span></span>
                                 {log.changedBy && <span className="truncate max-w-[150px]">{log.changedBy}</span>}
                                 <span className="ml-auto shrink-0">{fmtDate(log.createdAt)}</span>
                              </div>
                              {log.note && (
                                 <p className="mt-1 text-[11px] text-white/30 italic truncate">{log.note}</p>
                              )}
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* Footer pagination */}
            {!loading && totalPages > 1 && (
               <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
                  <span className="text-[11px] text-white/30">{total} bản ghi · Trang {page}/{totalPages}</span>
                  <div className="flex gap-1">
                     <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                     >
                        <ChevronLeft size={16} />
                     </button>
                     <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                     >
                        <ChevronRightIcon size={16} />
                     </button>
                  </div>
               </div>
            )}
         </div>
      </>
   );
};

// ─── Reason Modal (confirm save) ──────────────────────────────────────────────

interface ReasonModalProps {
   dirtyCount: number;
   onConfirm: (reason: string) => void;
   onCancel: () => void;
   saving: boolean;
}

const ReasonModal: React.FC<ReasonModalProps> = ({ dirtyCount, onConfirm, onCancel, saving }) => {
   const [reason, setReason] = useState('');

   return (
      <>
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onCancel} />
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
               {/* Header */}
               <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                     <FileText size={18} className="text-amber-400" />
                  </div>
                  <div>
                     <h3 className="text-sm font-bold text-white">Xác nhận lưu thay đổi</h3>
                     <p className="text-[11px] text-white/40">{dirtyCount} biến thể đã được chỉnh sửa</p>
                  </div>
               </div>

               {/* Reason field */}
               <label className="block mb-4">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">
                     Lý do điều chỉnh <span className="text-red-400">*</span>
                  </span>
                  <input
                     autoFocus
                     type="text"
                     placeholder="VD: Nhập hàng từ nhà cung cấp..."
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()); }}
                     className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                     {REASON_PRESETS.map((p) => (
                        <button
                           key={p}
                           type="button"
                           onClick={() => setReason(p)}
                           className={`text-[10px] px-2 py-1 rounded-full border transition-all ${reason === p
                              ? 'bg-primary/15 border-primary/40 text-primary'
                              : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
                              }`}
                        >
                           {p}
                        </button>
                     ))}
                  </div>
               </label>

               {/* Actions */}
               <div className="flex justify-end gap-3 mt-2">
                  <button
                     onClick={onCancel}
                     className="px-4 py-2 text-xs font-semibold text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all"
                  >
                     Huỷ
                  </button>
                  <button
                     onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
                     disabled={!reason.trim() || saving}
                     className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!reason.trim() || saving
                        ? 'bg-white/5 text-white/25 cursor-not-allowed'
                        : 'bg-primary hover:bg-red-700 text-white shadow-lg shadow-primary/20'
                        }`}
                  >
                     {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                     {saving ? 'Đang lưu…' : 'Xác nhận lưu'}
                  </button>
               </div>
            </div>
         </div>
      </>
   );
};

// ─── Product Group Row ────────────────────────────────────────────────────────

interface ProductGroupRowProps {
   group: ProductGroup;
   dirtyMap: Record<number, number>;
   onQuantityChange: (variantId: number, value: string) => void;
   onViewHistory: (variant: InventoryVariant) => void;
   defaultOpen: boolean;
}

const ProductGroupRow: React.FC<ProductGroupRowProps> = ({ group, dirtyMap, onQuantityChange, onViewHistory, defaultOpen }) => {
   const [open, setOpen] = useState(defaultOpen);

   const totalStock = group.variants.reduce((s, v) => s + v.stockQuantity, 0);
   const pendingTotalStock = group.variants.reduce((s, v) => s + (v.variantId in dirtyMap ? dirtyMap[v.variantId] : v.stockQuantity), 0);
   const hasLow = group.variants.some((v) => v.stockQuantity < 10);
   const hasOut = group.variants.some((v) => v.stockQuantity === 0);
   const hasDirty = group.variants.some((v) => v.variantId in dirtyMap);

   return (
      <>
         {/* ── Product Group Header ── */}
         <tr
            className={`cursor-pointer select-none border-b transition-colors ${open ? 'border-white/[0.06] bg-white/[0.03]' : 'border-white/[0.04] hover:bg-white/[0.02]'
               } ${hasDirty ? 'border-l-2 border-l-amber-400/50' : ''}`}
            onClick={() => setOpen((p) => !p)}
         >
            <td className="px-5 py-3" colSpan={7}>
               <div className="flex items-center gap-3">
                  <ChevronRight
                     size={15}
                     className={`text-white/30 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
                  />
                  <div className="w-8 h-10 rounded overflow-hidden bg-white/5 border border-white/5 shrink-0">
                     {group.primaryImageUrl ? (
                        <img src={group.primaryImageUrl} alt={group.productName} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center">
                           <Package size={12} className="text-white/20" />
                        </div>
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                     <span className="text-sm font-bold text-white tracking-tight">{group.productName}</span>
                     <span className="ml-2 text-[10px] text-white/30 font-medium">
                        {group.variants.length} biến thể
                     </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                     {hasDirty && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                           Đang chỉnh sửa
                        </span>
                     )}
                     {hasOut && !hasDirty && (
                        <span className="text-[10px] font-bold text-red-400">● Có biến thể hết hàng</span>
                     )}
                     {hasLow && !hasOut && !hasDirty && (
                        <span className="text-[10px] font-bold text-amber-400">● Có biến thể sắp hết</span>
                     )}
                     <span className="text-xs text-white/40">
                        Tổng tồn:{' '}
                        <span className={`font-bold ${pendingTotalStock !== totalStock ? 'text-amber-300' : 'text-white'}`}>
                           {pendingTotalStock !== totalStock ? pendingTotalStock : totalStock}
                        </span>
                     </span>
                  </div>
               </div>
            </td>
         </tr>

         {/* ── Variant Rows ── */}
         {open &&
            group.variants.map((v, idx) => {
               const isDirty = v.variantId in dirtyMap;
               const displayQty = isDirty ? dirtyMap[v.variantId] : v.stockQuantity;
               const status = getStockStatus(isDirty ? dirtyMap[v.variantId] : v.stockQuantity);
               const isLast = idx === group.variants.length - 1;

               return (
                  <tr
                     key={v.variantId}
                     className={`transition-colors ${isDirty
                        ? 'bg-amber-500/[0.035]'
                        : v.stockQuantity === 0
                           ? 'bg-red-900/[0.08] hover:bg-red-900/[0.12]'
                           : 'hover:bg-white/[0.015]'
                        } ${isLast ? 'border-b border-white/[0.07]' : 'border-b border-white/[0.03]'}`}
                  >
                     {/* Variant label */}
                     <td className="pl-14 pr-5 py-3">
                        <div className="flex items-center gap-1.5">
                           {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                           <span className="text-sm text-white/80 font-medium">
                              {v.variantLabel || <span className="text-white/30 italic text-xs">Mặc định</span>}
                           </span>
                        </div>
                     </td>

                     {/* SKU */}
                     <td className="px-5 py-3">
                        <code className="text-[11px] font-mono font-semibold text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                           {v.sku}
                        </code>
                     </td>

                     {/* Giá bán */}
                     <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-white/70 tabular-nums">
                           {v.price.toLocaleString('vi-VN')}₫
                        </span>
                     </td>

                     {/* Tồn kho HT */}
                     <td className="px-5 py-3 text-center">
                        <span className={`text-base font-black tabular-nums ${v.stockQuantity === 0 ? 'text-red-400' : v.stockQuantity < 10 ? 'text-amber-400' : 'text-white'
                           }`}>
                           {v.stockQuantity}
                        </span>
                     </td>

                     {/* Cập nhật */}
                     <td className="px-5 py-3">
                        <div className="flex justify-center">
                           <input
                              type="number"
                              min={0}
                              value={displayQty}
                              onChange={(e) => onQuantityChange(v.variantId, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className={`w-24 text-center rounded-lg px-3 py-1.5 text-sm font-semibold border transition-all focus:outline-none focus:ring-1 ${isDirty
                                 ? 'bg-amber-500/10 border-amber-400/40 text-amber-300 focus:ring-amber-400/30'
                                 : 'bg-white/[0.04] border-white/[0.08] text-white focus:ring-primary/40 focus:border-primary/50'
                                 }`}
                           />
                        </div>
                     </td>

                     {/* Trạng thái */}
                     <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.className}`}>
                           {status.label}
                        </span>
                     </td>

                     {/* Lịch sử */}
                     <td className="px-5 py-3 text-center">
                        <button
                           onClick={(e) => { e.stopPropagation(); onViewHistory(v); }}
                           title="Xem lịch sử tồn kho"
                           className="p-1.5 rounded-lg text-white/25 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                        >
                           <History size={14} />
                        </button>
                     </td>
                  </tr>
               );
            })}
      </>
   );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminRestock: React.FC = () => {
   const [variants, setVariants] = useState<InventoryVariant[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [search, setSearch] = useState('');
   const [onlyLowStock, setOnlyLowStock] = useState(false);
   const [dirtyMap, setDirtyMap] = useState<Record<number, number>>({});
   const [saving, setSaving] = useState(false);
   const [showReasonModal, setShowReasonModal] = useState(false);
   const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
   const [logVariant, setLogVariant] = useState<InventoryVariant | null>(null);
   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const [debouncedSearch, setDebouncedSearch] = useState('');

   useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
   }, [search]);

   const loadInventory = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await fetchInventory({ lowStock: onlyLowStock, search: debouncedSearch });
         setVariants(data);
         setDirtyMap({});
      } catch (e: any) {
         setError(e.message || 'Không thể tải dữ liệu tồn kho.');
      } finally {
         setLoading(false);
      }
   }, [onlyLowStock, debouncedSearch]);

   useEffect(() => { loadInventory(); }, [loadInventory]);

   const groups = groupVariants(variants);

   const totalVariants = variants.length;
   const lowStockCount = variants.filter((v) => v.stockQuantity > 0 && v.stockQuantity < 10).length;
   const outOfStockCount = variants.filter((v) => v.stockQuantity === 0).length;
   const dirtyCount = Object.keys(dirtyMap).length;

   const handleQuantityChange = (variantId: number, value: string) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return;
      setDirtyMap((prev) => ({ ...prev, [variantId]: Math.max(0, parsed) }));
   };

   const handleSaveConfirmed = async (reason: string) => {
      setSaving(true);
      setShowReasonModal(false);
      try {
         const changes = Object.entries(dirtyMap).map(([id, qty]) => ({
            variantId: Number(id),
            quantity: qty,
            reason,
         }));
         const res = await bulkUpdateStock(changes);
         setToast({ message: res.message, type: 'success' });
         await loadInventory();
      } catch (e: any) {
         setToast({ message: e.message || 'Lưu thất bại. Vui lòng thử lại.', type: 'error' });
      } finally {
         setSaving(false);
      }
   };

   useEffect(() => {
      if (!toast) return;
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
   }, [toast]);

   // ─── Keyboard shortcut: Escape closes any modal ──────────────────────────
   useEffect(() => {
      const handler = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            setShowReasonModal(false);
            setLogVariant(null);
         }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
   }, []);

   return (
      <div className="min-h-full p-8 max-w-[1600px] mx-auto flex flex-col gap-6" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
         <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
            @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
            @keyframes scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
            @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
            .animate-fade-in { animation: fade-in 0.15s ease-out both; }
            .animate-slide-in-right { animation: slide-in-right 0.25s ease-out both; }
            .animate-scale-in { animation: scale-in 0.18s ease-out both; }
            .animate-fade-in-up { animation: fade-in-up 0.2s ease-out both; }
         `}</style>

         {/* ── Header ── */}
         <header className="flex items-start justify-between gap-4">
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                     <PackagePlus size={20} className="text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Nhập Kho Nhanh</h1>
               </div>
               <p className="text-xs text-white/40 uppercase tracking-[0.15em] ml-[3.5rem]">
                  Cập nhật số lượng tồn kho · Mỗi lần lưu đều được ghi log
               </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
               {dirtyCount > 0 && (
                  <button
                     onClick={() => setDirtyMap({})}
                     className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-all"
                  >
                     Huỷ ({dirtyCount})
                  </button>
               )}
               <button
                  onClick={() => { if (dirtyCount > 0) setShowReasonModal(true); }}
                  disabled={dirtyCount === 0 || saving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${dirtyCount > 0 && !saving
                     ? 'bg-primary hover:bg-red-700 text-white shadow-primary/20 cursor-pointer'
                     : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                     }`}
               >
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Đang lưu…' : `Lưu thay đổi${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
               </button>
            </div>
         </header>

         {/* ── Stats Bar ── */}
         <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111] border border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-4">
               <div className="p-2.5 rounded-lg bg-white/5"><Package size={18} className="text-white/60" /></div>
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Tổng biến thể</p>
                  <p className="text-2xl font-black text-white">{loading ? '–' : totalVariants}</p>
               </div>
               {!loading && (
                  <div className="ml-auto text-right">
                     <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Nhóm SP</p>
                     <p className="text-lg font-bold text-white/60">{groups.length}</p>
                  </div>
               )}
            </div>
            <div className="bg-[#111] border border-amber-500/10 rounded-xl px-5 py-4 flex items-center gap-4">
               <div className="p-2.5 rounded-lg bg-amber-500/10"><TrendingDown size={18} className="text-amber-400" /></div>
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-semibold">Sắp hết hàng</p>
                  <p className="text-2xl font-black text-amber-400">{loading ? '–' : lowStockCount}</p>
               </div>
            </div>
            <div className="bg-[#111] border border-red-500/10 rounded-xl px-5 py-4 flex items-center gap-4">
               <div className="p-2.5 rounded-lg bg-red-500/10"><AlertTriangle size={18} className="text-red-400" /></div>
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-red-400/60 font-semibold">Hết hàng</p>
                  <p className="text-2xl font-black text-red-400">{loading ? '–' : outOfStockCount}</p>
               </div>
            </div>
         </div>

         {/* ── Filter Bar ── */}
         <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
               <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 transition-colors"
               />
               {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                     <X size={14} />
                  </button>
               )}
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
               <div
                  onClick={() => setOnlyLowStock((p) => !p)}
                  className={`relative w-10 h-5 rounded-full transition-colors border ${onlyLowStock ? 'bg-amber-500 border-amber-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'
                     }`}
               >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${onlyLowStock ? 'translate-x-5' : ''}`} />
               </div>
               <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">Chỉ hiện sắp hết hàng</span>
            </label>
            <button
               onClick={loadInventory}
               disabled={loading}
               className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white/50 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all"
            >
               <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
               Làm mới
            </button>
            {!loading && (
               <span className="text-xs text-white/30 ml-auto">
                  {groups.length} sản phẩm · {totalVariants} biến thể
               </span>
            )}
         </div>

         {/* ── Grouped Table ── */}
         <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden flex-1">
            {error ? (
               <div className="flex flex-col items-center justify-center py-24 text-center">
                  <AlertTriangle size={40} className="text-red-400 mb-4" />
                  <p className="text-white/60 font-medium mb-2">Lỗi tải dữ liệu</p>
                  <p className="text-white/30 text-sm mb-6">{error}</p>
                  <button onClick={loadInventory} className="text-xs font-bold uppercase tracking-wider text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-all">
                     Thử lại
                  </button>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white/[0.025] border-b border-white/[0.06]">
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Sản phẩm / Biến thể</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 w-36">Mã SKU</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-right w-32">Giá bán</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center w-36">Tồn kho HT</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center w-40">Cập nhật</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center w-32">Trạng thái</th>
                           <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center w-16">Lịch sử</th>
                        </tr>
                     </thead>
                     <tbody>
                        {loading ? (
                           Array.from({ length: 4 }).map((_, i) => <SkeletonGroup key={i} />)
                        ) : groups.length === 0 ? (
                           <tr>
                              <td colSpan={7}>
                                 <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <Package size={48} className="text-white/10 mb-4" />
                                    <p className="text-white/40 text-sm font-medium">
                                       {onlyLowStock || search ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có dữ liệu tồn kho'}
                                    </p>
                                    {(onlyLowStock || search) && (
                                       <button onClick={() => { setSearch(''); setOnlyLowStock(false); }} className="mt-3 text-xs text-primary hover:underline">
                                          Xoá bộ lọc
                                       </button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ) : (
                           groups.map((group) => (
                              <ProductGroupRow
                                 key={group.productId}
                                 group={group}
                                 dirtyMap={dirtyMap}
                                 onQuantityChange={handleQuantityChange}
                                 onViewHistory={setLogVariant}
                                 defaultOpen={onlyLowStock || !!search}
                              />
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            )}
         </div>

         {/* ── Sticky bottom save bar ── */}
         {dirtyCount > 0 && !saving && (
            <div className="sticky bottom-6 mx-auto bg-[#181818] border border-white/10 rounded-2xl px-6 py-3.5 flex items-center gap-6 shadow-2xl shadow-black/60 animate-fade-in-up z-10">
               <div className="flex items-center gap-2 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-sm font-semibold">{dirtyCount} biến thể đã thay đổi chưa được lưu</span>
               </div>
               <div className="ml-auto flex gap-3">
                  <button onClick={() => setDirtyMap({})} className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors px-3">
                     Huỷ bỏ
                  </button>
                  <button
                     onClick={() => setShowReasonModal(true)}
                     className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all"
                  >
                     <Save size={14} />
                     Lưu thay đổi
                  </button>
               </div>
            </div>
         )}

         {/* ── Modals & Panels ── */}
         {showReasonModal && (
            <ReasonModal
               dirtyCount={dirtyCount}
               onConfirm={handleSaveConfirmed}
               onCancel={() => setShowReasonModal(false)}
               saving={saving}
            />
         )}

         {logVariant && (
            <LogPanel
               variant={logVariant}
               onClose={() => setLogVariant(null)}
            />
         )}

         {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
   );
};
