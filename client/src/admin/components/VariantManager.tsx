/**
 * VariantManager — Reusable Variant Matrix Component
 * with GROUPED display (Hiển thị phân nhóm theo thuộc tính chính)
 *
 * Tính năng:
 * - Định nghĩa tối đa 2 nhóm phân loại (Màu sắc, Kích thước…)
 * - Tự động sinh ma trận Cartesian Product
 * - Giữ nguyên Price/Stock khi thay đổi nhóm
 * - Hiển thị phân nhóm theo thuộc tính chính (Accordion Cards)
 * - Thiết lập hàng loạt theo từng nhóm màu
 * - Accordion tự động khi có > 5 nhóm
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, RefreshCw, Layers, Zap, ChevronDown, ChevronUp, Package } from 'lucide-react';
import {
    AttributeGroup,
    VariantRow,
    generateCombinations,
    syncVariantMatrix,
    buildSkuSuffix,
} from '@/common/utils/cartesianProduct';
import { groupVariants, VariantGroup } from '@/common/utils/groupVariantsHelper';

export type { AttributeGroup, VariantRow };

// ─── Constants ────────────────────────────────────────────────────────────────
const VN_FONT: React.CSSProperties = { fontFamily: "'Be Vietnam Pro', sans-serif" };
const MAX_GROUPS = 2;
const ACCORDION_THRESHOLD = 5; // auto-collapse individual groups above this count
const PRESET_NAMES = ['Màu sắc', 'Kích thước', 'Chất liệu', 'Kiểu dáng'];

// ─────────────────────────────────────────────────────────────────────────────
// GroupRow — tag input for one attribute group (own useState, no hooks violation)
// ─────────────────────────────────────────────────────────────────────────────

interface GroupRowProps {
    group: AttributeGroup;
    index: number;
    canRemove: boolean;
    onUpdateName: (id: number, name: string) => void;
    onAddValue: (id: number, val: string) => void;
    onRemoveValue: (id: number, val: string) => void;
    onRemove: (id: number) => void;
}

const GroupRow: React.FC<GroupRowProps> = ({
    group, index, canRemove, onUpdateName, onAddValue, onRemoveValue, onRemove,
}) => {
    const [inputVal, setInputVal] = useState('');
    const [focused, setFocused] = useState(false);

    const commit = () => {
        const trimmed = inputVal.trim();
        if (trimmed) { onAddValue(group.id, trimmed); setInputVal(''); }
    };

    return (
        <div className="border border-white/[0.07] rounded-xl p-5 space-y-4 bg-black/20 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                        {index + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                        Nhóm phân loại {index + 1}
                    </span>
                </div>
                {canRemove && (
                    <button type="button" onClick={() => onRemove(group.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Name presets */}
            <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Tên nhóm phân loại
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                    {PRESET_NAMES.map(preset => (
                        <button key={preset} type="button"
                            onClick={() => onUpdateName(group.id, preset)}
                            className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${group.name === preset
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                                }`}>
                            {preset}
                        </button>
                    ))}
                </div>
                <input
                    value={group.name}
                    onChange={e => onUpdateName(group.id, e.target.value)}
                    placeholder="VD: Màu sắc, Kích thước..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/60 transition-colors"
                />
            </div>

            {/* Tag input */}
            <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Giá trị phân loại{' '}
                    <span className="text-white/30 normal-case font-normal">(Nhấn Enter để thêm)</span>
                </label>
                <div className={`min-h-[44px] flex flex-wrap gap-1.5 p-2 rounded-lg border transition-colors ${focused ? 'border-primary/50 bg-black/30' : 'border-white/10 bg-black/20'
                    }`}>
                    {group.values.map(val => (
                        <span key={val}
                            className="inline-flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1 text-xs text-white">
                            {val}
                            <button type="button" onClick={() => onRemoveValue(group.id, val)}
                                className="text-white/30 hover:text-red-400 transition-colors ml-0.5">
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    <input
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => { setFocused(false); commit(); }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
                            if (e.key === 'Backspace' && !inputVal && group.values.length > 0)
                                onRemoveValue(group.id, group.values[group.values.length - 1]);
                        }}
                        placeholder={group.values.length === 0
                            ? `VD: ${index === 0 ? 'Đỏ, Xanh, Trắng' : 'S, M, L, XL'}` : ''}
                        className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none placeholder:text-white/20 py-0.5 px-1"
                    />
                </div>
                {group.values.length > 0 && (
                    <p className="text-[10px] text-white/30 mt-1">{group.values.length} giá trị</p>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// GroupCard — one accordion section per primary attribute value
// ─────────────────────────────────────────────────────────────────────────────

interface GroupCardProps {
    group: VariantGroup;
    secondaryAttrName: string;
    isFirst: boolean;
    defaultOpen: boolean;
    updateVariant: (rowId: string, field: 'sku' | 'price' | 'stock', value: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
    group, secondaryAttrName, isFirst, defaultOpen, updateVariant,
}) => {
    const [open, setOpen] = useState(defaultOpen);
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkStock, setBulkStock] = useState('');


    const totalStock = group.rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
    const hasUnsetPrice = group.rows.some(r => !r.price || Number(r.price) <= 0);
    const hasUnsetStock = group.rows.some(r => !r.stock || Number(r.stock) === 0);

    const applyBulkPrice = () => {
        if (!bulkPrice) return;
        group.rows.forEach(r => updateVariant(r.id, 'price', bulkPrice));
        setBulkPrice('');
    };
    const applyBulkStock = () => {
        if (!bulkStock) return;
        group.rows.forEach(r => updateVariant(r.id, 'stock', bulkStock));
        setBulkStock('');
    };

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${open ? 'border-white/10' : 'border-white/[0.06]'
            }`}>
            {/* ── Group Header ───────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] transition-colors text-left"
            >
                <div className="flex items-center gap-2.5">
                    <div>
                        <span className="text-sm font-bold text-white">
                            {group.primaryAttr && (
                                <span className="text-white/40 font-normal text-xs mr-1">{group.primaryAttr}:</span>
                            )}
                            {group.primaryValue}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30">{group.rows.length} phân loại</span>
                            <span className="text-white/20">·</span>
                            <span className="text-[10px] text-white/30">Kho: {totalStock.toLocaleString('vi-VN')}</span>
                            {isFirst && (
                                <>
                                    <span className="text-white/20">·</span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                                        Nhóm mặc định
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Warning badges */}
                    {hasUnsetPrice && (
                        <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full whitespace-nowrap">
                            ⚠ Chưa có giá
                        </span>
                    )}
                    {hasUnsetStock && (
                        <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full whitespace-nowrap">
                            ⚠ Kho trống
                        </span>
                    )}
                    {open ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                </div>
            </button>

            {/* ── Group Body ─────────────────────────────────────────────── */}
            {open && (
                <div>
                    {/* Bulk apply bar for this group */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/[0.04] border-b border-white/[0.05]">
                        <Zap size={11} className="text-primary/60 shrink-0" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">
                            Áp dụng tất cả {group.primaryValue}:
                        </span>
                        <div className="flex items-center gap-1.5">
                            <input type="number" value={bulkPrice}
                                onChange={e => setBulkPrice(e.target.value)}
                                placeholder="Giá (₫)"
                                className="w-24 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                            />
                            <button type="button" onClick={applyBulkPrice} disabled={!bulkPrice}
                                className="px-2 py-1 text-[10px] font-semibold bg-primary/20 border border-primary/30 text-primary rounded-md hover:bg-primary/30 transition-all disabled:opacity-40">
                                Áp dụng giá
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 ml-1">
                            <input type="number" value={bulkStock}
                                onChange={e => setBulkStock(e.target.value)}
                                placeholder="Kho"
                                className="w-20 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                            />
                            <button type="button" onClick={applyBulkStock} disabled={!bulkStock}
                                className="px-2 py-1 text-[10px] font-semibold bg-primary/20 border border-primary/30 text-primary rounded-md hover:bg-primary/30 transition-all disabled:opacity-40">
                                Áp dụng kho
                            </button>
                        </div>
                    </div>

                    {/* Sub-table: only secondary attribute column shown (primary is in header) */}
                    <div>
                        {/* Column headers */}
                        <div className={`grid gap-3 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01] text-[10px] font-semibold text-white/30 uppercase tracking-wider ${secondaryAttrName ? 'grid-cols-[1.5fr_1.5fr_1fr_1fr]' : 'grid-cols-[2fr_1.5fr_1fr_1fr]'
                            }`}>
                            <span>{secondaryAttrName || 'Phân loại'}</span>
                            <span>Mã SKU</span>
                            <span>Giá bán (₫)</span>
                            <span>Kho hàng</span>
                        </div>

                        {/* Variant rows */}
                        <div className="divide-y divide-white/[0.03]">
                            {group.rows.map((row, idx) => {
                                const secondaryValue = row.combination.find(c => c.attr === secondaryAttrName)?.value
                                    ?? (row.combination.find(c => c.attr !== group.primaryAttr)?.value ?? row.label);
                                const isDefaultRow = idx === 0 && isFirst;

                                return (
                                    <div key={row.id}
                                        className={`grid gap-3 px-4 py-2.5 items-center hover:bg-white/[0.015] transition-colors ${secondaryAttrName ? 'grid-cols-[1.5fr_1.5fr_1fr_1fr]' : 'grid-cols-[2fr_1.5fr_1fr_1fr]'
                                            }`}>
                                        {/* Secondary label */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            {isDefaultRow && (
                                                <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                                                    Mặc định
                                                </span>
                                            )}
                                            <span className="text-sm text-white truncate">
                                                {secondaryAttrName ? secondaryValue : row.label}
                                            </span>
                                            {row.variantId && (
                                                <span className="shrink-0 text-[9px] text-white/20 font-mono">#{row.variantId}</span>
                                            )}
                                        </div>

                                        {/* SKU */}
                                        <input
                                            value={row.sku}
                                            onChange={e => updateVariant(row.id, 'sku', e.target.value)}
                                            className="bg-black/30 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 font-mono focus:outline-none focus:border-primary/40 w-full"
                                        />

                                        {/* Price */}
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={row.price}
                                                onChange={e => updateVariant(row.id, 'price', e.target.value)}
                                                placeholder="0"
                                                className={`w-full bg-black/30 border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors ${!row.price || Number(row.price) <= 0
                                                    ? 'border-yellow-500/30 focus:border-yellow-400/50'
                                                    : 'border-white/[0.08] focus:border-primary/40'
                                                    }`}
                                            />
                                        </div>

                                        {/* Stock */}
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={row.stock}
                                                onChange={e => updateVariant(row.id, 'stock', e.target.value)}
                                                placeholder="0"
                                                className={`w-full bg-black/30 border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors ${!row.stock || Number(row.stock) === 0
                                                    ? 'border-orange-500/20 focus:border-orange-400/40'
                                                    : 'border-white/[0.08] focus:border-primary/40'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// GlobalBulkBar — apply to ALL variants at once + SKU regen
// ─────────────────────────────────────────────────────────────────────────────

interface GlobalBulkBarProps {
    onApplyPrice: (price: string) => void;
    onApplyStock: (stock: string) => void;
    onRegenSkus: () => void;
}

const GlobalBulkBar: React.FC<GlobalBulkBarProps> = ({ onApplyPrice, onApplyStock, onRegenSkus }) => {
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    return (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.025] border border-white/[0.07] rounded-xl">
            <Zap size={12} className="text-primary/60 shrink-0" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">Toàn bộ:</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="Giá tất cả (₫)"
                className="w-28 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
            <button type="button" onClick={() => { if (price) { onApplyPrice(price); setPrice(''); } }}
                disabled={!price}
                className="px-2.5 py-1.5 text-[10px] font-semibold bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-all disabled:opacity-40">
                Áp dụng giá
            </button>
            <div className="w-px h-4 bg-white/10" />
            <input type="number" value={stock} onChange={e => setStock(e.target.value)}
                placeholder="Kho tất cả"
                className="w-24 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
            <button type="button" onClick={() => { if (stock) { onApplyStock(stock); setStock(''); } }}
                disabled={!stock}
                className="px-2.5 py-1.5 text-[10px] font-semibold bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-all disabled:opacity-40">
                Áp dụng kho
            </button>
            <div className="ml-auto">
                <button type="button" onClick={onRegenSkus}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-white/40 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all">
                    <RefreshCw size={10} />
                    Tạo lại SKU
                </button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// VariantManager — Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface VariantManagerProps {
    baseSku: string;
    basePrice: string;
    initialGroups?: AttributeGroup[];
    initialVariants?: VariantRow[];
    onChange: (variants: VariantRow[]) => void;
}

export const VariantManager: React.FC<VariantManagerProps> = ({
    baseSku, basePrice, initialGroups, initialVariants, onChange,
}) => {
    const [groups, setGroups] = useState<AttributeGroup[]>(
        initialGroups ?? [{ id: Date.now(), name: '', values: [] }]
    );
    const [variants, setVariants] = useState<VariantRow[]>(initialVariants ?? []);

    // ── Sync: regenerate matrix on group change ──────────────────────────────
    useEffect(() => {
        const combos = generateCombinations(groups);
        if (combos.length === 0) { setVariants([]); return; }
        setVariants(prev => syncVariantMatrix(combos, prev, baseSku, basePrice));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups]);

    // ── Notify parent on variant change ──────────────────────────────────────
    useEffect(() => { onChange(variants); }, [variants, onChange]);

    // ── Group helpers ────────────────────────────────────────────────────────
    const addGroup = () => { if (groups.length < MAX_GROUPS) setGroups(g => [...g, { id: Date.now(), name: '', values: [] }]); };
    const removeGroup = useCallback((id: number) => setGroups(g => g.filter(x => x.id !== id)), []);
    const updateGroupName = useCallback((id: number, name: string) => setGroups(g => g.map(x => x.id === id ? { ...x, name } : x)), []);
    const addValue = useCallback((id: number, val: string) => {
        const t = val.trim(); if (!t) return;
        setGroups(g => g.map(x => x.id === id && !x.values.includes(t) ? { ...x, values: [...x.values, t] } : x));
    }, []);
    const removeValue = useCallback((id: number, val: string) =>
        setGroups(g => g.map(x => x.id === id ? { ...x, values: x.values.filter(v => v !== val) } : x)), []);

    // ── Variant helpers ──────────────────────────────────────────────────────
    const updateVariant = useCallback((rowId: string, field: 'sku' | 'price' | 'stock', value: string) =>
        setVariants(v => v.map(x => x.id === rowId ? { ...x, [field]: value } : x)), []);

    const applyPriceAll = (price: string) => setVariants(v => v.map(x => ({ ...x, price })));
    const applyStockAll = (stock: string) => setVariants(v => v.map(x => ({ ...x, stock })));
    const regenSkus = () => {
        const base = baseSku.trim() || 'SKU';
        setVariants(v => v.map(x => ({ ...x, sku: `${base}-${buildSkuSuffix(x.combination)}` })));
    };

    // ── Grouped display ──────────────────────────────────────────────────────
    const grouped = groupVariants(variants);
    const useAccordion = grouped.groups.length > ACCORDION_THRESHOLD;

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalStock = variants.reduce((s, r) => s + (Number(r.stock) || 0), 0);
    const issueCount = variants.filter(r => !r.price || Number(r.price) <= 0 || !r.stock || Number(r.stock) === 0).length;

    return (
        <div style={VN_FONT} className="space-y-4">

            {/* ── Section Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={15} className="text-primary/70" />
                    <h3 className="text-sm font-bold text-white">Phân loại hàng</h3>
                    {variants.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary">
                            {variants.length} biến thể
                        </span>
                    )}
                    {issueCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-400">
                            ⚠ {issueCount} cần kiểm tra
                        </span>
                    )}
                </div>
                {variants.length > 0 && (
                    <span className="text-[11px] text-white/30">
                        Tổng kho: <span className="text-white/60 font-semibold">{totalStock.toLocaleString('vi-VN')}</span>
                    </span>
                )}
            </div>

            {/* ── Attribute Groups Definition ────────────────────────────── */}
            <div className="space-y-3">
                {groups.map((group, i) => (
                    <GroupRow key={group.id} group={group} index={i} canRemove={groups.length > 1}
                        onUpdateName={updateGroupName} onAddValue={addValue}
                        onRemoveValue={removeValue} onRemove={removeGroup} />
                ))}
                {groups.length < MAX_GROUPS && (
                    <button type="button" onClick={addGroup}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-white/40 hover:border-primary/40 hover:text-primary transition-all text-sm">
                        <Plus size={14} />
                        Thêm nhóm phân loại {groups.length + 1}
                        <span className="text-[10px] text-white/25">(tối đa {MAX_GROUPS} nhóm)</span>
                    </button>
                )}
            </div>

            {/* ── Grouped Variant Table ──────────────────────────────────── */}
            {variants.length > 0 && (
                <div className="space-y-2">
                    {/* Global bulk bar */}
                    <GlobalBulkBar onApplyPrice={applyPriceAll} onApplyStock={applyStockAll} onRegenSkus={regenSkus} />

                    {/* Accordion hint */}
                    {useAccordion && (
                        <p className="text-[10px] text-white/30 text-center py-1">
                            {grouped.groups.length} nhóm · Click tiêu đề để mở/đóng từng nhóm
                        </p>
                    )}

                    {/* Group cards */}
                    <div className="space-y-2">
                        {grouped.groups.map((g, i) => (
                            <GroupCard
                                key={g.primaryValue}
                                group={g}
                                secondaryAttrName={grouped.secondaryAttrName}
                                isFirst={i === 0}
                                defaultOpen={!useAccordion || i < 2}
                                updateVariant={updateVariant}
                            />
                        ))}
                    </div>

                    {/* Summary footer */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-white/30">
                        <span>{variants.length} phân loại · {grouped.groups.length} nhóm</span>
                        <span>Biến thể đầu tiên sẽ là mặc định khi hiển thị trên cửa hàng</span>
                    </div>
                </div>
            )}

            {/* ── Empty state ────────────────────────────────────────────── */}
            {variants.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border border-dashed border-white/10 text-center">
                    <Package size={28} className="text-white/15" />
                    <div>
                        <p className="text-sm text-white/30 font-medium">Chưa có phân loại hàng</p>
                        <p className="text-[11px] text-white/20 mt-1">
                            {groups.some(g => g.name.trim())
                                ? 'Thêm giá trị vào nhóm để tự động tạo bảng phân loại'
                                : 'Đặt tên và thêm giá trị cho nhóm phân loại bên trên'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VariantManager;
