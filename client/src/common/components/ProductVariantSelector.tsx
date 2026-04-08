/**
 * ProductVariantSelector.tsx — Pro Max Edition
 *
 * Enterprise-grade variant selector for the AISTHEA storefront PDP.
 *
 * ## Core Architecture: The Availability Matrix
 * ───────────────────────────────────────────────────────────────
 * Given a flat array of ProductVariant objects:
 *
 *   [{ variantId:1, price:200000, stockQuantity:5, attributes:[{Màu:'Đỏ'},{Size:'S'}] },
 *    { variantId:2, price:200000, stockQuantity:0, attributes:[{Màu:'Đỏ'},{Size:'M'}] },
 *    { variantId:3, price:220000, stockQuantity:8, attributes:[{Màu:'Đen'},{Size:'S'}] }, ...]
 *
 * The matrix is a nested Map: Map<attrName → Map<attrValue → Set<variantId>>>
 *
 * To check if "Size M" is available given "Màu Đỏ" is selected:
 *   1. Get all variantIds where Màu === 'Đỏ'  → Set A
 *   2. Get all variantIds where Size === 'M'   → Set B
 *   3. Intersect A ∩ B
 *   4. From the intersection, find at least one variant with stockQuantity > 0
 *   → If yes: enabled. If no: show with diagonal strikethrough (hết hàng)
 *
 * ## Data Normalization
 * ───────────────────────────────────────────────────────────────
 * The API returns variants with EITHER:
 *   a) `v.attributes[]` — { attributeName, attributeValue }  (from SP)
 *   b) `v.variantAttributes[]` — { value: { value, attribute: { name } } } (from Prisma)
 *
 * `normalizeAttrs()` smooths this into a consistent Record<attrName, value>.
 *
 * ## UI/UX
 * ───────────────────────────────────────────────────────────────
 * • Color attributes → circular swatches (hex) or emoji + text pills
 * • Text attributes (Size etc.) → rectangular pills
 * • Disabled = greyed + diagonal SVG line overlay — still visible, not hidden
 * • Price animates to the resolved variant price (framer-motion number counter)
 * • "Add to Cart" button has 3 states: unselected / in-stock / out-of-stock
 * • Unselected state triggers a highlight-pulse on the missing attribute row
 * • Exposes onVariantChange(variant|null) → parent syncs image gallery
 *
 * Language: 100% Vietnamese — 'Be Vietnam Pro' font
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, AlertCircle, Ruler, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductSizeGuide, ProductVariant } from '@/common/services/product.service';


// ─── Font & palette ───────────────────────────────────────────────────────────
const VN_FONT: React.CSSProperties = { fontFamily: "'Be Vietnam Pro', sans-serif" };
const VN_NUM = new Intl.NumberFormat('vi-VN');

// ─── Color detection ──────────────────────────────────────────────────────────
/** Vietnamese color names → CSS color for swatch background */
const COLOR_CSS: Record<string, string> = {
    // Đỏ
    'do': '#ef4444', 'do dam': '#b91c1c', 'do nhat': '#fca5a5',
    'do tuoi': '#f87171', 'mau do': '#ef4444',
    // Cam
    'cam': '#f97316', 'cam dat': '#c2410c',
    // Vàng
    'vang': '#eab308', 'vang nhat': '#fde68a', 'vang dam': '#ca8a04',
    // Xanh lá
    'xanh la': '#22c55e', 'xanh la cay': '#16a34a', 'xanh nhat': '#86efac',
    'xanh pastel': '#6ee7b7', 'xanh bac ha': '#6ee7b7',
    // Xanh dương / navy
    'xanh': '#3b82f6', 'xanh duong': '#3b82f6', 'xanh lam': '#3b82f6',
    'xanh navy': '#1e3a5f', 'xanh den': '#172554', 'xanh co vit': '#0e7490',
    'xanh than': '#1e3a8a', 'xanh dam': '#1d4ed8', 'xanh cobalt': '#1e40af',
    // Tím
    'tim': '#a855f7', 'tim nhat': '#d8b4fe', 'tim dam': '#7e22ce',
    // Hồng
    'hong': '#f472b6', 'hong nhat': '#fbcfe8', 'hong dam': '#db2777',
    'hong pastel': '#f9a8d4',
    // Trắng
    'trang': '#f9fafb', 'trang sua': '#fefce8', 'trang kem': '#fffbeb',
    // Đen
    'den': '#111111', 'den tuyen': '#000000',
    // Xám — FULL range
    'xam': '#9ca3af',
    'xam nhat': '#e5e7eb',      // Gray 200
    'xam sang': '#d1d5db',      // Gray 300
    'xam trung': '#9ca3af',     // Gray 400
    'xam dam': '#4b5563',       // Gray 600  ← "Xám đậm"
    'xam toi': '#374151',       // Gray 700
    'xam den': '#1f2937',       // Gray 800
    'xam bac': '#cbd5e1',       // Slate 300
    // Nâu & Be
    'nau': '#92400e', 'nau nhat': '#d97706', 'nau dam': '#78350f',
    'be': '#d4b483', 'kem': '#fef3c7', 'cafe': '#6b3f1a',
    // Rêu / Olive
    'reu': '#65a30d', 'olive': '#4d7c0f',
};

const COLOR_ATTR_NAMES = new Set(['màu', 'mau', 'màu sắc', 'mau sac', 'color', 'colour']);
const SIZE_ATTR_NAMES = new Set(['kích thước', 'kich thuoc', 'size']);

function isColorAttr(name: string): boolean {
    return COLOR_ATTR_NAMES.has(name.toLowerCase().trim());
}

function isSizeAttr(name: string): boolean {
    return SIZE_ATTR_NAMES.has(normalizeColorKey(name));
}

function normalizeColorKey(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ');
}

function getSwatchColor(value: string): string {
    // 1. Already a hex code → use as-is
    if (/^#[0-9A-Fa-f]{3,6}$/.test(value.trim())) return value.trim();

    const key = normalizeColorKey(value);

    // 2. Exact match
    if (COLOR_CSS[key]) return COLOR_CSS[key];

    // 3. Partial match — find the longest key that is a substring of `key`
    let bestMatch = '';
    let bestColor = '';
    for (const [k, c] of Object.entries(COLOR_CSS)) {
        if (key.includes(k) && k.length > bestMatch.length) {
            bestMatch = k;
            bestColor = c;
        }
    }
    if (bestColor) return bestColor;

    // 4. Fallback: consistent hash (deterministic, but may look random)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '000000'.substring(0, 6 - c.length) + c;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Normalized flat attribute map for one variant */
type AttrMap = Record<string, string>; // { 'Màu sắc': 'Đỏ', 'Kích thước': 'S' }

/** One "column" in our selector (e.g. Màu sắc / Kích thước) */
interface AttrAxis {
    name: string;        // "Màu sắc"
    values: string[];    // ["Đỏ", "Đen", "Hồng"] — ordered by first appearance
    isColor: boolean;
}

export interface ProductVariantSelectorProps {
    variants: ProductVariant[];
    basePrice: number;
    /** Images linked by variant attributeValue (for gallery sync) */
    images?: { imageUrl: string; thumbnailUrl?: string; associatedAttributeValue?: string }[];
    sizeGuide?: ProductSizeGuide | null;
    onVariantChange: (variant: ProductVariant | null) => void;
    onAddToCart: (variant: ProductVariant, quantity: number) => void;
    onRequestSizeAdvice?: () => void;
    /** If true show the quantity stepper (default: true) */
    showQuantity?: boolean;
}

// ─── Normalize API variant → AttrMap ─────────────────────────────────────────
/**
 * The API may return attributes in two shapes:
 *   Shape A (SP): v.attributes = [{attributeName, attributeValue}]
 *   Shape B (Prisma): v.variantAttributes = [{value:{value, attribute:{name}}}]
 * Returns a unified AttrMap.
 */
function normalizeAttrs(v: ProductVariant): AttrMap {
    const out: AttrMap = {};

    // Shape A
    if (v.attributes?.length) {
        for (const a of v.attributes) {
            const attr = a as { attributeName?: string, attributeValue?: string, value?: string, attribute?: { name: string } };
            const name = attr.attributeName ?? attr.attribute?.name ?? '';
            const value = attr.attributeValue ?? attr.value ?? '';
            if (name && value) out[name] = String(value);
        }
    }

    // Shape B
    if (v.variantAttributes?.length) {
        for (const va of v.variantAttributes) {
            const vAttr = va as { attributeValue?: string, attribute?: { name: string }, value?: { value: string, attribute?: { name: string } } };
            const name = vAttr.attribute?.name ?? vAttr.value?.attribute?.name ?? '';
            const value = vAttr.value?.value ?? vAttr.attributeValue ?? '';
            if (name && value) out[name] = String(value);
        }
    }

    return out;
}

// ─── Build Availability Matrix ────────────────────────────────────────────────
/**
 * Returns Map<attrName → Map<attrValue → Set<variantId>>>
 *
 * Example:
 *   matrix.get('Màu sắc').get('Đỏ') = Set{1, 2}   (variants 1&2 have Màu=Đỏ)
 *   matrix.get('Kích thước').get('S') = Set{1, 3}
 *
 * To check [Màu=Đỏ] ∩ [Size=S]: intersect the two Sets → {1} → variant 1 is in stock?
 */
function buildMatrix(
    variants: ProductVariant[],
    attrMaps: AttrMap[]
): Map<string, Map<string, Set<number>>> {
    const matrix = new Map<string, Map<string, Set<number>>>();

    for (let i = 0; i < variants.length; i++) {
        const vid = variants[i].variantId;
        for (const [attrName, attrVal] of Object.entries(attrMaps[i])) {
            if (!matrix.has(attrName)) matrix.set(attrName, new Map());
            const inner = matrix.get(attrName)!;
            if (!inner.has(attrVal)) inner.set(attrVal, new Set());
            inner.get(attrVal)!.add(vid);
        }
    }

    return matrix;
}

/**
 * Intersect two Sets — returns new Set with only common elements.
 */
function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a].filter(x => b.has(x)));
}

/**
 * Given the current selections (excluding one axis) and a candidate value for that axis,
 * check whether any in-stock variant satisfies ALL current selections + this candidate.
 *
 * @param targetAttr   The attribute we're testing (e.g. 'Kích thước')
 * @param targetValue  The candidate value (e.g. 'M')
 * @param selected     Current selection state (e.g. { 'Màu sắc': 'Đỏ' })
 * @param matrix       The pre-built availability matrix
 * @param variants     Raw variants array (to look up stockQuantity)
 * @param attrMaps     Pre-computed AttrMaps parallel to variants[]
 */
function checkAvailability(
    targetAttr: string,
    targetValue: string,
    selected: Record<string, string>,
    matrix: Map<string, Map<string, Set<number>>>,
    variants: ProductVariant[],
    attrMaps: AttrMap[]
): 'available' | 'oos' | 'incompatible' {
    // Start with all variant IDs that have this target value
    const targetSet = matrix.get(targetAttr)?.get(targetValue);
    if (!targetSet || targetSet.size === 0) return 'incompatible';

    // Intersect with every OTHER already-selected axis
    let candidateIds = new Set(targetSet);
    for (const [otherAttr, otherVal] of Object.entries(selected)) {
        if (otherAttr === targetAttr) continue;
        const otherSet = matrix.get(otherAttr)?.get(otherVal);
        if (!otherSet) return 'incompatible';
        candidateIds = intersect(candidateIds, otherSet);
        if (candidateIds.size === 0) return 'incompatible';
    }

    // From surviving candidates, check stock
    for (const vid of candidateIds) {
        const idx = variants.findIndex(v => v.variantId === vid);
        if (idx >= 0 && variants[idx].stockQuantity > 0) return 'available';
    }
    return 'oos'; // exists in matrix but all are out of stock
}

// ─── Price animation hook ──────────────────────────────────────────────────────
/**
 * Returns a display string that animates between numeric values.
 * Shows previous value briefly, then snaps to new value on the next frame.
 */
function useAnimatedPrice(price: number): string {
    const [display, setDisplay] = useState(price);
    const prev = useRef(price);

    useEffect(() => {
        if (price !== prev.current) {
            setDisplay(price);
            prev.current = price;
        }
    }, [price]);

    return VN_NUM.format(display);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Circular color swatch OR text pill depending on whether we have a CSS color */
const ColorSwatch: React.FC<{
    value: string;
    selected: boolean;
    availability: 'available' | 'oos' | 'incompatible';
    t: (key: string) => string;
    onClick: () => void;
}> = ({ value, selected, availability, t, onClick }) => {
    const cssColor = getSwatchColor(value);
    const disabled = availability !== 'available';
    const isOos = availability === 'oos';
    const disabledSelected = disabled && selected;

    if (cssColor) {
        return (
            <button
                type="button"
                title={`${value}${isOos ? t('variantSelector.outOfStockIcon') : ''}`}
                disabled={disabled}
                onClick={onClick}
                className={`relative flex-shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none
                    ${disabledSelected
                        ? 'ring-1 ring-offset-1 ring-offset-[#0a0a0a] ring-white/15 scale-100 shadow-none'
                        : selected
                            ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white scale-110 shadow-xl'
                            : 'hover:scale-105'
                    }
                    ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{ width: 32, height: 32, backgroundColor: cssColor }}
            >
                {/* Diagonal strikethrough for OOS */}
                {isOos && (
                    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none">
                        <line x1="2" y1="30" x2="30" y2="2" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )}
                {selected && !disabled && (
                    <CheckCircle2 className="absolute -top-0.5 -right-0.5 w-3 h-3 text-white drop-shadow" />
                )}
            </button>
        );
    }

    // Fallback: text pill with optional emoji
    return (
        <button
            type="button"
            title={`${value}${isOos ? ' — Hết hàng' : ''}`}
            disabled={disabled}
            onClick={onClick}
            className={`relative flex-shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none
                ${disabledSelected
                    ? 'ring-1 ring-offset-1 ring-offset-[#0a0a0a] ring-white/15 scale-100 shadow-none'
                    : selected
                        ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-white scale-110 shadow-xl'
                        : 'hover:scale-105'
                }
                ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ width: 32, height: 32, backgroundColor: cssColor }}
        >
            <span>{value}</span>
            {/* Diagonal strikethrough for OOS */}
            {isOos && (
                <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="2" y1="30" x2="30" y2="2" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                </svg>
            )}
            {selected && !disabled && (
                <CheckCircle2 className="absolute -top-0.5 -right-0.5 w-3 h-3 text-white drop-shadow" />
            )}
        </button>
    );
};

/** Rectangular size pill */
const SizePill: React.FC<{
    value: string;
    selected: boolean;
    availability: 'available' | 'oos' | 'incompatible';
    onClick: () => void;
}> = ({ value, selected, availability, onClick }) => {
    const disabled = availability !== 'available';
    const isOos = availability === 'oos';
    const disabledSelected = disabled && selected;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`relative h-10 min-w-[52px] px-3 rounded-lg text-[11px] font-bold tracking-wide
                border transition-all duration-200 focus-visible:outline-none
                ${disabledSelected
                    ? 'border-white/[0.10] bg-white/[0.04] text-white/30 cursor-not-allowed opacity-45'
                    : selected
                        ? 'border-white bg-white text-black shadow-lg shadow-white/10'
                        : disabled
                            ? 'border-white/[0.08] text-white/20 cursor-not-allowed opacity-40'
                            : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white cursor-pointer'
                    }
            `}
        >
            {value}
            {/* Diagonal strikethrough for OOS */}
            {isOos && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-lg overflow-hidden">
                    <line x1="4" y1="38" x2="48" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                </svg>
            )}
        </button>
    );
};

// ─── Shake animation ─────────────────────────────────────────────────────────
const shakeVariants = {
    shake: {
        x: [0, -6, 6, -4, 4, -2, 2, 0],
        transition: { duration: 0.45 },
    },
    idle: { x: 0 },
};

type SizeGuideTabKey = 'table' | 'measure' | 'fit' | 'model';

const SizeGuideModal: React.FC<{
    guide?: ProductSizeGuide | null;
    t: (key: string, options?: Record<string, unknown>) => string;
    activeTab: SizeGuideTabKey;
    onTabChange: (tab: SizeGuideTabKey) => void;
    onClose: () => void;
    onRequestSizeAdvice?: () => void;
}> = ({ guide, t, activeTab, onTabChange, onClose, onRequestSizeAdvice }) => {
    const tabs: Array<{ key: SizeGuideTabKey; label: string; hidden?: boolean }> = [
        { key: 'table', label: t('sizeGuide.sizeTable') },
        { key: 'measure', label: t('sizeGuide.howToMeasure') },
        { key: 'fit', label: t('sizeGuide.fitNote'), hidden: !guide?.fitNote },
        {
            key: 'model',
            label: t('sizeGuide.modelInfo'),
            hidden: !guide?.modelInfo?.heightCm && !guide?.modelInfo?.weightKg && !guide?.modelInfo?.wearSize,
        },
    ].filter((tab) => !tab.hidden);

    const handleAdviceClick = () => {
        onClose();
        onRequestSizeAdvice?.();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm px-3 py-6 md:px-6"
            >
                <div className="flex h-full items-end justify-center md:items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/60"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/70">
                                    {t('variantSelector.viewSizeGuide')}
                                </p>
                                <h3 className="mt-2 text-lg font-black text-white">
                                    {t('sizeGuide.title')}
                                </h3>
                                <p className="mt-1 text-sm text-white/45">
                                    {guide?.templateName ?? t('sizeGuide.noGuideAvailable')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-white/30 hover:text-white"
                                aria-label={t('sizeGuide.close')}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {guide ? (
                            <>
                                <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3 md:px-6">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => onTabChange(tab.key)}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
                                                activeTab === tab.key
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="overflow-y-auto px-5 py-5 md:px-6">
                                    {activeTab === 'table' && (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                                                <span className="rounded-full border border-white/10 px-2.5 py-1">
                                                    {guide.templateName}
                                                </span>
                                                {guide.fitType && (
                                                    <span className="rounded-full border border-white/10 px-2.5 py-1">
                                                        {guide.fitType}
                                                    </span>
                                                )}
                                                <span className="rounded-full border border-white/10 px-2.5 py-1">
                                                    {guide.unit}
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto rounded-2xl border border-white/10">
                                                <table className="min-w-full border-collapse text-left text-sm text-white/80">
                                                    <thead className="bg-white/[0.04]">
                                                        <tr>
                                                            {guide.columns.map((column) => (
                                                                <th key={column} className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
                                                                    {column}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {guide.rows.map((row, index) => (
                                                            <tr key={`${guide.templateKey}-${index}`} className="border-t border-white/10">
                                                                {guide.columns.map((column) => (
                                                                    <td key={`${column}-${index}`} className="px-4 py-3 text-sm text-white/80">
                                                                        {row[column] ?? '—'}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'measure' && (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {guide.howToMeasure.map((tip) => (
                                                <div key={tip.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">{tip.label}</p>
                                                    <p className="mt-2 text-sm leading-relaxed text-white/75">{tip.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'fit' && (
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                            <p className="text-sm leading-relaxed text-white/80">
                                                {guide.fitNote || t('sizeGuide.noGuideAvailable')}
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'model' && (
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                                                    {t('sizeGuide.modelHeight')}
                                                </p>
                                                <p className="mt-3 text-2xl font-black text-white">
                                                    {guide.modelInfo.heightCm ? `${guide.modelInfo.heightCm}cm` : '—'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                                                    {t('sizeGuide.modelWeight')}
                                                </p>
                                                <p className="mt-3 text-2xl font-black text-white">
                                                    {guide.modelInfo.weightKg ? `${guide.modelInfo.weightKg}kg` : '—'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                                                    {t('sizeGuide.modelWearSize')}
                                                </p>
                                                <p className="mt-3 text-2xl font-black text-white">
                                                    {guide.modelInfo.wearSize || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="px-5 py-8 md:px-6">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                    <p className="text-sm leading-relaxed text-white/70">
                                        {t('sizeGuide.noGuideAvailable')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-white/10 px-5 py-4 md:px-6">
                            <button
                                type="button"
                                onClick={handleAdviceClick}
                                className="flex w-full items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-primary transition hover:border-primary hover:bg-primary hover:text-white"
                            >
                                {t('sizeGuide.askForAdvice')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
    variants,
    basePrice,
    images = [],
    sizeGuide,
    onVariantChange,
    onAddToCart,
    onRequestSizeAdvice,
    showQuantity = true,
}) => {
    const { t } = useTranslation('products');
    const [selected, setSelected] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [shakeAttr, setShakeAttr] = useState<string | null>(null);
    const [showSizeGuide, setShowSizeGuide] = useState(false);
    const [activeSizeGuideTab, setActiveSizeGuideTab] = useState<SizeGuideTabKey>('table');

    // ── Pre-compute attr maps once ───────────────────────────────────────────
    const attrMaps = useMemo<AttrMap[]>(
        () => variants.map(normalizeAttrs),
        [variants]
    );

    // ── Build cross-availability matrix ─────────────────────────────────────
    const matrix = useMemo(
        () => buildMatrix(variants, attrMaps),
        [variants, attrMaps]
    );

    // ── Derive ordered attribute axes ────────────────────────────────────────
    /**
     * Build ordered list of Axes (attrs) and their possible values.
     * Order: color attrs first, then text attrs (alphabetical within each group).
     * Values are ordered by first-appearance across all variants.
     */
    const axes = useMemo<AttrAxis[]>(() => {
        const nameOrder: string[] = [];
        const valueOrder = new Map<string, string[]>();

        for (const attrMap of attrMaps) {
            for (const [name, val] of Object.entries(attrMap)) {
                if (!valueOrder.has(name)) {
                    nameOrder.push(name);
                    valueOrder.set(name, []);
                }
                const vals = valueOrder.get(name)!;
                if (!vals.includes(val)) vals.push(val);
            }
        }

        // Sort: color axes first
        nameOrder.sort((a, b) => {
            const aIsColor = isColorAttr(a) ? 0 : 1;
            const bIsColor = isColorAttr(b) ? 0 : 1;
            return aIsColor - bIsColor;
        });

        const SIZE_ORDER: Record<string, number> = {
            'xxs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6, 'xxl': 7, '2xl': 8, '3xl': 9, '4xl': 10
        };

        return nameOrder.map(name => {
            const values = valueOrder.get(name) ?? [];
            const isSize = isSizeAttr(name);

            if (isSize) {
                values.sort((a, b) => {
                    const aLower = a.toLowerCase().trim();
                    const bLower = b.toLowerCase().trim();
                    const rankA = SIZE_ORDER[aLower];
                    const rankB = SIZE_ORDER[bLower];

                    if (rankA && rankB) return rankA - rankB;
                    if (rankA) return -1;
                    if (rankB) return 1;

                    const numA = parseFloat(a);
                    const numB = parseFloat(b);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

                    return a.localeCompare(b);
                });
            }

            return {
                name,
                values,
                isColor: isColorAttr(name),
            };
        });
    }, [attrMaps]);

    // ── Derive the currently resolved variant ────────────────────────────────
    /**
     * useMemo: find the single variant that matches ALL current selections.
     * If no axes exist, return the first/default variant.
     * If selections are incomplete, return null.
     */
    const resolvedVariant = useMemo<ProductVariant | null>(() => {
        if (axes.length === 0) {
            return variants.find(v => v.isDefault) ?? variants[0] ?? null;
        }

        // All axes must be selected
        const allSelected = axes.every(ax => selected[ax.name]);
        if (!allSelected) return null;

        return (
            variants.find((v, i) =>
                axes.every(ax => attrMaps[i][ax.name] === selected[ax.name])
            ) ?? null
        );
    }, [variants, attrMaps, axes, selected]);

    // ── Sync with parent ─────────────────────────────────────────────────────
    useEffect(() => {
        onVariantChange(resolvedVariant);
        setQuantity(1); // reset qty on variant change
    }, [resolvedVariant, onVariantChange]);

    // ── Auto-select default variant on mount ─────────────────────────────────
    useEffect(() => {
        if (variants.length === 0 || axes.length === 0) return;
        const defaultVariant = variants.find(v => v.isDefault) ?? variants[0];
        const defaultMap = attrMaps[variants.indexOf(defaultVariant)];
        if (defaultMap) setSelected({ ...defaultMap });
    }, [variants, attrMaps, axes]);

    // ── Derived price to display ─────────────────────────────────────────────
    const displayPrice = resolvedVariant
        ? Number(resolvedVariant.price)
        : basePrice;

    const priceStr = useAnimatedPrice(displayPrice);

    // ── Price range for "no selection yet" case ───────────────────────────────
    const priceRange = useMemo(() => {
        if (variants.length === 0) return null;
        const prices = variants.map(v => Number(v.price)).filter(Boolean);
        if (prices.length === 0) return null;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max ? null : { min, max };
    }, [variants]);

    useEffect(() => {
        if (!showSizeGuide) return;

        const previousOverflow = document.body.style.overflow;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowSizeGuide(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [showSizeGuide]);

    // ── Stock state ───────────────────────────────────────────────────────────
    const stockQty = resolvedVariant?.stockQuantity ?? null;
    const isFullySelected = axes.every(ax => selected[ax.name]);
    const hasAnyStock = variants.some((variant) => Number(variant.stockQuantity ?? 0) > 0);
    const isOutOfStock = isFullySelected ? stockQty === 0 : !hasAnyStock;
    const isInStock = isFullySelected ? stockQty !== null && stockQty > 0 : hasAnyStock;

    // ── Select handler ────────────────────────────────────────────────────────
    const handleSelect = useCallback((attrName: string, value: string) => {
        setSelected(prev => {
            const next = { ...prev, [attrName]: value };
            return next;
        });
    }, []);

    // ── Add to cart ───────────────────────────────────────────────────────────
    const handleAddToCart = useCallback(() => {
        if (!isFullySelected) {
            // Shake missing attribute rows
            const missing = axes.filter(ax => !selected[ax.name]);
            if (missing.length) {
                setShakeAttr(missing[0].name);
                setTimeout(() => setShakeAttr(null), 600);
            }
            return;
        }
        if (!resolvedVariant || isOutOfStock) return;
        onAddToCart(resolvedVariant, quantity);
    }, [isFullySelected, resolvedVariant, isOutOfStock, onAddToCart, quantity, axes, selected]);

    // ── Cart button state ─────────────────────────────────────────────────────
    const cartBtnState: 'unselected' | 'oos' | 'active' =
        !isFullySelected ? 'unselected' : isOutOfStock ? 'oos' : 'active';

    // ─── Render ───────────────────────────────────────────────────────────────
    if (variants.length === 0) return null;

    return (
        <div style={VN_FONT} className="flex flex-col gap-6">

            {/* ── Price block ────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {isInStock ? (
                    <motion.span
                        key="in-stock-top"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold text-emerald-400 whitespace-nowrap"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        {t('variantSelector.inStock')}
                    </motion.span>
                ) : isOutOfStock ? (
                    <motion.span
                        key="out-of-stock-top"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold text-red-400 whitespace-nowrap"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {t('variantSelector.outOfStockBtn')}
                    </motion.span>
                ) : null}
            </AnimatePresence>

            <div className="inline-grid max-w-full grid-cols-[12.5ch_auto] items-center gap-x-3 min-h-[2.75rem]">
                <div className="w-[12.5ch] overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={displayPrice}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.18 }}
                            className="text-xl font-black text-white tracking-tight whitespace-nowrap tabular-nums"
                        >
                            {priceStr}đ
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Spacer column to keep price width stable */}
                <div className="min-w-[92px]" />

                {/* Price range hint when no full selection yet */}
                {!resolvedVariant && priceRange && (
                    <span className="col-span-2 text-xs text-white/35 font-medium truncate -mt-0.5">
                        {t('variantSelector.priceFrom', { min: VN_NUM.format(priceRange.min), max: VN_NUM.format(priceRange.max) })}
                    </span>
                )}
            </div>


            {/* ── Attribute axes ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 w-full mb-8 bg-surface-dark/40 border border-white/5 rounded-lg p-6 lg:p-8">
                {axes.map(ax => {
                    const isMissing = !selected[ax.name] && shakeAttr === ax.name;
                    const isSizeAxis = isSizeAttr(ax.name);

                    return (
                        <motion.div
                            key={ax.name}
                            variants={shakeVariants}
                            animate={isMissing ? 'shake' : 'idle'}
                        >
                            {/* Axis label row */}
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                                        {ax.name}
                                    </span>
                                    {selected[ax.name] && (
                                        <span className="text-[10px] font-semibold text-white/80 normal-case tracking-normal">
                                            — {selected[ax.name]}
                                        </span>
                                    )}
                                    {!selected[ax.name] && isMissing && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center gap-1 text-[9px] text-amber-400 font-semibold"
                                        >
                                            <AlertCircle size={9} />
                                            {t('variantSelector.pleaseSelect')}
                                        </motion.span>
                                    )}
                                </div>
                                {isSizeAxis && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveSizeGuideTab('table');
                                            setShowSizeGuide(true);
                                        }}
                                        className="hidden items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary/70 transition-colors hover:text-primary md:inline-flex"
                                    >
                                        <Ruler size={10} /> {t('variantSelector.viewSizeGuide')}
                                    </button>
                                )}
                            </div>

                            {/* Highlight ring on missing unselected attr */}
                            <div className={`transition-all rounded-xl p-0.5 -m-0.5
                                ${!selected[ax.name] && shakeAttr === ax.name
                                    ? 'ring-1 ring-amber-400/30 bg-amber-400/5'
                                    : ''
                                }`}
                            >
                                <div className="flex flex-wrap gap-2.5">
                                    {ax.values.map(val => {
                                        const availability = checkAvailability(
                                            ax.name, val, selected,
                                            matrix, variants, attrMaps
                                        );
                                        const isSelected = selected[ax.name] === val;

                                        return ax.isColor ? (
                                            <ColorSwatch
                                                key={val}
                                                value={val}
                                                selected={isSelected}
                                                availability={availability}
                                                t={t}
                                                onClick={() => handleSelect(ax.name, val)}
                                            />
                                        ) : (
                                            <SizePill
                                                key={val}
                                                value={val}
                                                selected={isSelected}
                                                availability={availability}
                                                onClick={() => handleSelect(ax.name, val)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {isSizeAxis && (
                                <div className="mt-3 flex md:hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveSizeGuideTab('table');
                                            setShowSizeGuide(true);
                                        }}
                                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary/80 transition-colors hover:text-primary"
                                    >
                                        <Ruler size={10} /> {t('variantSelector.viewSizeGuide')}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Quantity + Add to Cart ──────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {/* Quantity stepper */}
                {showQuantity && (
                    <div className="h-14 w-32 flex-shrink-0 border border-white/10 flex items-center
                                    justify-between px-3 rounded-lg bg-white/[0.03]">
                        <button
                            type="button"
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-7 h-full flex items-center justify-center text-white/40
                                       hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="text-lg leading-none select-none">−</span>
                        </button>
                        <span className="text-white font-black text-sm select-none">{quantity}</span>
                        <button
                            type="button"
                            onClick={() =>
                                setQuantity(q => stockQty !== null ? Math.min(stockQty, q + 1) : q + 1)
                            }
                            className="w-7 h-full flex items-center justify-center text-white/40
                                       hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="text-lg leading-none select-none">+</span>
                        </button>
                    </div>
                )}

                {/* CTA button */}
                <motion.button
                    type="button"
                    onClick={handleAddToCart}
                    whileTap={cartBtnState === 'active' ? { scale: 0.97 } : undefined}
                    disabled={cartBtnState !== 'active'}
                    className={`
                        flex-1 h-14 rounded-lg flex items-center justify-center gap-3
                        text-[12px] font-black tracking-[0.18em] uppercase transition-all duration-300
                        ${cartBtnState === 'active'
                            ? 'bg-primary hover:bg-red-600 text-white shadow-lg shadow-primary/25 cursor-pointer'
                            : cartBtnState === 'oos'
                                ? 'bg-white/[0.06] text-white/30 cursor-not-allowed border border-white/[0.06]'
                                : 'bg-white/[0.04] text-white/40 cursor-pointer border border-white/[0.08] hover:border-amber-400/30 hover:bg-amber-400/5'
                        }
                    `}
                >
                    {cartBtnState === 'active' && (
                        <>
                            <ShoppingBag size={16} />
                            {t('variantSelector.addToCart')}
                            <span className="w-px h-4 bg-white/20" />
                            <span className="font-medium normal-case tracking-normal text-white/80">
                                {VN_NUM.format(displayPrice * quantity)}đ
                            </span>
                        </>
                    )}
                    {cartBtnState === 'oos' && t('variantSelector.outOfStockBtn')}
                    {cartBtnState === 'unselected' && (
                        <>
                            <AlertCircle size={13} className="text-amber-400/60" />
                            {t('variantSelector.unselectedBtn')}
                        </>
                    )}
                </motion.button>
            </div>

            {/* ── OOS notice ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {isOutOfStock && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-center gap-2 text-[11px] text-white/40 font-medium
                                   bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2"
                    >
                        <AlertCircle size={12} className="text-white/30 shrink-0" />
                        {t('variantSelector.outOfStockSubtitle')} <strong className="text-white/60">{t('variantSelector.outOfStockHighlight')}</strong>
                        {t('variantSelector.outOfStockDesc')}
                    </motion.div>
                )}
            </AnimatePresence>

            {showSizeGuide && (
                <SizeGuideModal
                    guide={sizeGuide}
                    t={t}
                    activeTab={activeSizeGuideTab}
                    onTabChange={setActiveSizeGuideTab}
                    onClose={() => setShowSizeGuide(false)}
                    onRequestSizeAdvice={onRequestSizeAdvice}
                />
            )}
        </div>
    );
};

export default ProductVariantSelector;
