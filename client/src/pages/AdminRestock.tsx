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
} from 'lucide-react';
import {
   fetchInventory,
   bulkUpdateStock,
   type InventoryVariant,
} from '../services/inventory.service';

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

/** Group a flat variant list into ProductGroup[] */
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
      {/* group header skeleton */}
      <tr className="bg-white/[0.025] border-b border-white/[0.06]">
         <td colSpan={6} className="px-5 py-3">
            <div className="h-4 w-48 rounded bg-white/[0.07] animate-pulse" />
         </td>
      </tr>
      {/* variant rows skeleton */}
      {[1, 2, 3].map((i) => (
         <tr key={i} className="border-b border-white/[0.04]">
            {[1, 2, 3, 4, 5, 6].map((j) => (
               <td key={j} className="px-5 py-4 pl-14">
                  <div className="h-3.5 rounded bg-white/[0.05] animate-pulse" style={{ width: `${55 + j * 7}%` }} />
               </td>
            ))}
         </tr>
      ))}
   </>
);

// ─── Product Group Row ────────────────────────────────────────────────────────

interface ProductGroupRowProps {
   group: ProductGroup;
   dirtyMap: Record<number, number>;
   onQuantityChange: (variantId: number, value: string) => void;
   defaultOpen: boolean;
}

const ProductGroupRow: React.FC<ProductGroupRowProps> = ({ group, dirtyMap, onQuantityChange, defaultOpen }) => {
   const [open, setOpen] = useState(defaultOpen);

   // Aggregate stats for the header
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
            <td className="px-5 py-3" colSpan={6}>
               <div className="flex items-center gap-3">
                  {/* Chevron */}
                  <ChevronRight
                     size={15}
                     className={`text-white/30 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
                  />

                  {/* Product image */}
                  <div className="w-8 h-10 rounded overflow-hidden bg-white/5 border border-white/5 shrink-0">
                     {group.primaryImageUrl ? (
                        <img src={group.primaryImageUrl} alt={group.productName} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center">
                           <Package size={12} className="text-white/20" />
                        </div>
                     )}
                  </div>

                  {/* Product name + variant count */}
                  <div className="flex-1 min-w-0">
                     <span className="text-sm font-bold text-white tracking-tight">{group.productName}</span>
                     <span className="ml-2 text-[10px] text-white/30 font-medium">
                        {group.variants.length} biến thể
                     </span>
                  </div>

                  {/* Aggregate stats */}
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
                     {/* Sản phẩm (variant label only, indented) */}
                     <td className="pl-14 pr-5 py-3">
                        <div className="flex items-center gap-1.5">
                           {isDirty && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                           )}
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

                     {/* Tồn kho hiện tại */}
                     <td className="px-5 py-3 text-center">
                        <span className={`text-base font-black tabular-nums ${v.stockQuantity === 0 ? 'text-red-400' : v.stockQuantity < 10 ? 'text-amber-400' : 'text-white'
                           }`}>
                           {v.stockQuantity}
                        </span>
                     </td>

                     {/* Cập nhật (input) */}
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
   const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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

   const handleSave = async () => {
      if (dirtyCount === 0) return;
      setSaving(true);
      try {
         const changes = Object.entries(dirtyMap).map(([id, qty]) => ({ variantId: Number(id), quantity: qty }));
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

   return (
      <div className="min-h-full p-8 max-w-[1600px] mx-auto flex flex-col gap-6" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
         <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

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
                  Cập nhật số lượng tồn kho · Nhóm theo sản phẩm
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
                  onClick={handleSave}
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
                        </tr>
                     </thead>
                     <tbody>
                        {loading ? (
                           Array.from({ length: 4 }).map((_, i) => <SkeletonGroup key={i} />)
                        ) : groups.length === 0 ? (
                           <tr>
                              <td colSpan={6}>
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
                     onClick={handleSave}
                     className="flex items-center gap-2 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all"
                  >
                     <Save size={14} />
                     Lưu thay đổi
                  </button>
               </div>
            </div>
         )}

         {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
   );
};
