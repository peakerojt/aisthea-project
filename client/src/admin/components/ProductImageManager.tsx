/**
 * ProductImageManager — Pro Max v2 (Zoned Edition)
 *
 * UI Design (ui-ux-pro-max principles):
 * ─────────────────────────────────────────────────────────
 * • Two clearly-separated ZONES instead of one flat grid
 *
 *   ZONE A ── "Ảnh chung"  (variantId = null)
 *             Blue-accented header, full-width dropzone
 *             Grid: 2→4→5 cols
 *
 *   ZONE B ── One card per attribute value (e.g. Đỏ / Đen / Hồng)
 *             Each variant gets its OWN row with:
 *               - Color-dot header with emoji + name
 *               - Horizontal scrollable image strip
 *               - Compact inline drop zone at the end of the strip
 *
 * • Drag-to-reorder within ZONE A via @dnd-kit/sortable
 * • Skeleton shimmer cards while uploading
 * • Hover actions: ⭐ Ảnh bìa / 🗑️ Xóa (confirmed) / per-card zone-transfer button
 * • Self-dismissing toast system (Vietnamese)
 * • 100% Vietnamese UI — 'Be Vietnam Pro' font
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    Star, Trash2, ImageIcon, Loader2, CheckCircle2, AlertCircle,
    Upload, X, GripVertical, Plus, Layers, MoveRight,
} from 'lucide-react';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_BASE_URL } from '@/common/utils/api';
import { compressImage } from '@/common/utils/imageCompression';

import type { VariantRow } from '@/admin/components/VariantManager';

// ─── Constants ────────────────────────────────────────────────────────────────
const VN_FONT: React.CSSProperties = { fontFamily: "'Be Vietnam Pro', sans-serif" };
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProductImageState {
    id: string;
    file?: File;
    publicId?: string;
    url: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
    /** null/undefined = Zone A (general); string = Zone B variant value */
    associatedAttributeValue?: string;
    dbImageId?: number;
    status: 'idle' | 'uploading' | 'done' | 'error';
    errorMsg?: string;
}

export interface ProductImageManagerProps {
    productId?: number;
    variants: VariantRow[];
    attributeGroups?: { name: string; values: string[] }[];
    initialImages?: ProductImageState[];
    onChange: (images: ProductImageState[]) => void;
}

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function getPrimaryAttrGroups(variants: VariantRow[]): string[] {
    const seen = new Set<string>();
    for (const v of variants) {
        // Prefer 'Màu sắc' attribute; fall back to first attribute
        const colorEntry = v.combination.find(c => c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color');
        const p = colorEntry?.value ?? v.combination[0]?.value;
        if (p && !seen.has(p)) seen.add(p);
    }
    return Array.from(seen);
}

/** Vietnamese color name → real CSS color map */
const VN_COLOR_MAP: Record<string, string> = {
    // Normalize key: lowercase + strip diacritics + replace đ→d
    trang: '#e8e8e8',
    den: '#555555',
    do: '#e05252',
    xanh: '#4a90d9',
    'xanh duong': '#4a90d9',
    'xanh than': '#1e3a5f',
    'xanh la': '#4caf50',
    'xanh navy': '#1e3a5f',
    vang: '#f5c842',
    'vang kim': '#d4a017',
    cam: '#f08030',
    tim: '#9b59b6',
    hong: '#f48fb1',
    'hong phan': '#f8bbd0',
    nau: '#8d6e63',
    be: '#d2b48c',
    xam: '#9e9e9e',
    'xam dam': '#616161',
    kem: '#fff8dc',
    bac: '#c0c0c0',
};

/** Map a Vietnamese color name to its real CSS color, or fall back to HSL hash */
function getAccentColor(str: string): string {
    const key = str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ')
        .trim();
    if (VN_COLOR_MAP[key]) return VN_COLOR_MAP[key];
    // Fallback: deterministic hue
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360},55%,58%)`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const ToastList: React.FC<{ toasts: Toast[]; remove: (id: string) => void }> = ({ toasts, remove }) => (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
            <div
                key={t.id}
                style={VN_FONT}
                onClick={() => remove(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-[13px] font-medium
                    pointer-events-auto cursor-pointer select-none transition-colors duration-300
                    ${t.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-300'
                        : t.type === 'error' ? 'bg-red-950/95 border-red-500/40 text-red-300'
                            : 'bg-slate-900/95 border-white/10 text-white/80'}`}
            >
                {t.type === 'success' && <CheckCircle2 size={15} className="shrink-0" />}
                {t.type === 'error' && <AlertCircle size={15} className="shrink-0" />}
                <span>{t.message}</span>
                <X size={12} className="ml-auto opacity-50 hover:opacity-100 shrink-0" />
            </div>
        ))}
    </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard: React.FC<{ slim?: boolean }> = ({ slim }) => (
    <div className={`relative rounded-xl overflow-hidden border-2 border-white/10 bg-white/[0.04]
        flex flex-col items-center justify-center gap-1.5 shrink-0
        ${slim ? 'w-24 h-28' : 'aspect-square w-full'}`}
    >
        <Loader2 size={18} className="animate-spin text-primary/40" />
        <span className="text-[9px] text-white/25">Đang tải…</span>
    </div>
);

// ─── Zone-A Image Card (sortable) ─────────────────────────────────────────────
interface CardAProps {
    img: ProductImageState;
    onPrimary: (id: string) => void;
    onRemove: (id: string) => void;
}
const CardA: React.FC<CardAProps> = ({ img, onPrimary, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: img.id, disabled: img.status !== 'done' && img.status !== 'idle' });

    const [confirmDelete, setConfirmDelete] = useState(false);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.55 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group aspect-square">
            <div className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-colors duration-200
                ${img.isPrimary ? 'border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.25)]'
                    : img.status === 'error' ? 'border-red-500/50'
                        : 'border-white/[0.08] group-hover:border-white/20'}`}
            >
                <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" draggable={false} />

                {/* Uploading overlay */}
                {img.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin text-white" />
                    </div>
                )}

                {/* Error overlay */}
                {img.status === 'error' && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center px-2 text-center">
                        <AlertCircle size={16} className="text-red-400 mb-1" />
                        <span className="text-[9px] text-red-300">{img.errorMsg || 'Lỗi tải lên'}</span>
                    </div>
                )}

                {/* Primary badge */}
                {img.isPrimary && img.status !== 'uploading' && (
                    <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-black text-[8px] font-bold
                                    px-1.5 py-0.5 rounded-full flex items-center gap-0.5 leading-none shadow-md">
                        <Star size={7} fill="currentColor" /> Ảnh bìa
                    </div>
                )}

                {/* Done checkmark */}
                {img.status === 'done' && !img.isPrimary && (
                    <div className="absolute top-1.5 left-1.5 bg-emerald-500/80 rounded-full p-0.5">
                        <CheckCircle2 size={9} className="text-white" />
                    </div>
                )}

                {/* Hover action bar */}
                {img.status !== 'uploading' && (
                    <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-px">
                        {!img.isPrimary && (
                            <button type="button" onClick={() => onPrimary(img.id)}
                                className="w-full bg-black/78 hover:bg-yellow-500/20 py-1 text-[9px]
                                           text-white/70 hover:text-yellow-300 flex items-center justify-center gap-0.5 transition-colors cursor-pointer">
                                <Star size={8} /> Đặt làm ảnh bìa
                            </button>
                        )}
                        {!confirmDelete ? (
                            <button type="button" onClick={() => setConfirmDelete(true)}
                                className="w-full bg-red-900/78 hover:bg-red-700/80 py-1 text-[9px]
                                           text-white/70 hover:text-white flex items-center justify-center gap-0.5 transition-colors cursor-pointer">
                                <Trash2 size={8} /> Xóa
                            </button>
                        ) : (
                            <div className="flex">
                                <button type="button" onClick={() => setConfirmDelete(false)}
                                    className="flex-1 bg-slate-800/90 py-1 text-[9px] text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                                    Huỷ
                                </button>
                                <button type="button" onClick={() => { onRemove(img.id); setConfirmDelete(false); }}
                                    className="flex-1 bg-red-600/90 hover:bg-red-500 py-1 text-[9px] text-white font-bold flex items-center justify-center transition-colors cursor-pointer">
                                    Xác nhận xóa
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Drag handle */}
            {img.status === 'done' && (
                <div {...listeners} {...attributes}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-60 hover:!opacity-100
                               bg-black/55 rounded-full p-1 cursor-grab active:cursor-grabbing transition-opacity z-10">
                    <GripVertical size={9} className="text-white" />
                </div>
            )}
        </div>
    );
};

// ─── Zone-B Image Card (horizontal strip, no DnD) ─────────────────────────────
interface CardBProps {
    img: ProductImageState;
    onRemove: (id: string) => void;
    accentColor: string;
}
const CardB: React.FC<CardBProps> = ({ img, onRemove, accentColor }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="relative group shrink-0 w-24 h-28">
            <div className="relative w-full h-full rounded-xl overflow-hidden border-2 transition-colors duration-200
                            border-white/[0.08] group-hover:border-white/20"
                style={{ borderColor: img.status === 'done' ? `${accentColor}55` : undefined }}>
                <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" draggable={false} />

                {img.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                )}
                {img.status === 'error' && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <AlertCircle size={14} className="text-red-400" />
                    </div>
                )}
                {img.status === 'done' && (
                    <div className="absolute top-1 left-1 w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                )}

                {img.status !== 'uploading' && !confirmDelete && (
                    <button type="button" onClick={() => setConfirmDelete(true)}
                        className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity
                                   bg-red-900/80 hover:bg-red-700 py-0.5 text-[8px] text-white flex items-center justify-center gap-0.5 cursor-pointer">
                        <Trash2 size={7} /> Xóa
                    </button>
                )}
                {confirmDelete && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-1">
                        <span className="text-[8px] text-white/70 text-center">Xóa ảnh này?</span>
                        <div className="flex gap-1">
                            <button type="button" onClick={() => setConfirmDelete(false)}
                                className="px-1.5 py-0.5 text-[7px] bg-white/10 text-white/60 rounded cursor-pointer hover:bg-white/20">
                                Huỷ
                            </button>
                            <button type="button" onClick={() => { onRemove(img.id); setConfirmDelete(false); }}
                                className="px-1.5 py-0.5 text-[7px] bg-red-600 text-white rounded cursor-pointer hover:bg-red-500 font-bold">
                                Xóa
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Zone-B Row (one variant value) ───────────────────────────────────────────
interface ZoneBRowProps {
    attrVal: string;
    variantCount: number;
    images: ProductImageState[];
    onRemove: (id: string) => void;
    onAddFiles: (files: File[], attrVal: string) => void;
}
const ZoneBRow: React.FC<ZoneBRowProps> = ({ attrVal, variantCount, images, onRemove, onAddFiles }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const accentColor = getAccentColor(attrVal);
    const doneCount = images.filter(i => i.status === 'done').length;

    const acceptFiles = (list: FileList | null) => {
        if (!list) return;
        const valid = Array.from(list).filter(f => ACCEPT_TYPES.includes(f.type));
        if (valid.length) onAddFiles(valid, attrVal);
    };

    return (
        <div className="rounded-xl overflow-hidden border border-white/[0.07] transition-colors duration-200"
            style={{ borderColor: over ? `${accentColor}55` : undefined }}>
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.025] border-b border-white/[0.05]">
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-black/30"
                    style={{ backgroundColor: accentColor }} />

                {/* Emoji + name */}
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-white truncate">{attrVal}</span>
                </div>

                {/* Counters */}
                <div className="flex items-center gap-3 ml-auto text-[10px] text-white/35 shrink-0">
                    <span>{variantCount} biến thể</span>
                    <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{
                            backgroundColor: doneCount > 0 ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                            color: doneCount > 0 ? accentColor : 'rgba(255,255,255,0.3)',
                        }}
                    >
                        {doneCount} ảnh
                    </span>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium
                                   bg-white/[0.05] hover:bg-white/10 text-white/50 hover:text-white
                                   border border-white/[0.06] hover:border-white/15 transition-colors cursor-pointer"
                    >
                        <Plus size={10} /> Thêm ảnh
                    </button>
                </div>
            </div>

            {/* Image strip */}
            <div
                className={`px-4 py-3 transition-colors ${over ? 'bg-white/[0.03]' : ''}`}
                onDragEnter={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={e => { e.preventDefault(); setOver(false); }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault(); setOver(false);
                    acceptFiles(e.dataTransfer.files);
                }}
            >
                {images.length === 0 ? (
                    /* Empty drop prompt */
                    <div
                        className="flex items-center gap-3 h-20 rounded-xl border-2 border-dashed cursor-pointer
                                   transition-colors duration-200 px-5"
                        style={{ borderColor: over ? accentColor : 'rgba(255,255,255,0.08)' }}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accentColor}20` }}>
                            <Upload size={14} style={{ color: accentColor }} />
                        </div>
                        <div>
                            <p className="text-xs text-white/45 font-medium">Kéo thả hoặc nhấn để tải ảnh {attrVal}</p>
                            <p className="text-[10px] text-white/25 mt-0.5">JPG · PNG · WebP · Tối đa 5MB</p>
                        </div>
                    </div>
                ) : (
                    /* Horizontal scroll strip */
                    <div className="flex gap-2.5 overflow-x-auto pb-2"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
                        {images.map(img =>
                            img.status === 'uploading' && !img.url.startsWith('blob:')
                                ? <SkeletonCard key={img.id} slim />
                                : <CardB key={img.id} img={img} onRemove={onRemove} accentColor={accentColor} />
                        )}

                        {/* Inline add button at end of strip */}
                        <div
                            className="shrink-0 w-24 h-28 rounded-xl border-2 border-dashed flex flex-col
                                       items-center justify-center gap-1.5 cursor-pointer transition-colors duration-200
                                       border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]"
                            onClick={() => inputRef.current?.click()}
                        >
                            <Plus size={16} className="text-white/25 group-hover:text-white/50" />
                            <span className="text-[9px] text-white/25 text-center leading-tight px-1">
                                Thêm<br />{attrVal}
                            </span>
                        </div>
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT_TYPES.join(',')}
                    multiple
                    className="hidden"
                    onChange={e => { acceptFiles(e.target.files); e.target.value = ''; }}
                />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductImageManager — Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
    productId, variants, attributeGroups, initialImages = [], onChange,
}) => {
    const [images, setImages] = useState<ProductImageState[]>(initialImages);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [dropActive, setDropActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // ── Toast ──────────────────────────────────────────────────────────────
    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = uid();
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    // ── State mutator ──────────────────────────────────────────────────────
    const update = useCallback((fn: (p: ProductImageState[]) => ProductImageState[]) => {
        setImages(p => { const n = fn(p); onChange(n); return n; });
    }, [onChange]);

    // ── Upload single file ─────────────────────────────────────────────────
    const uploadFile = useCallback(async (tempId: string, file: File, zone?: string) => {
        const { file: compressed } = await compressImage(file);

        if (!productId) {
            update(p => p.map(i => i.id === tempId ? { ...i, file: compressed, status: 'idle' } : i));
            return;
        }

        update(p => p.map(i => i.id === tempId ? { ...i, status: 'uploading' } : i));
        try {
            const fd = new FormData();
            fd.append('file', compressed);
            fd.append('isPrimary', 'false');
            if (zone) fd.append('associatedAttributeValue', zone);

            const res = await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
                method: 'POST', credentials: 'include', body: fd,
            });
            if (!res.ok) throw new Error(`Lỗi ${res.status}`);
            const data = await res.json();

            update(p => p.map(i => i.id !== tempId ? i : {
                ...i,
                status: 'done',
                url: data.data?.imageUrl ?? i.url,
                thumbnailUrl: data.data?.thumbnailUrl,
                publicId: data.data?.publicId,
                dbImageId: data.data?.imageId,
                file: undefined,
            }));
        } catch (err: unknown) {
            update(p => p.map(i => i.id === tempId ? { ...i, status: 'error', errorMsg: (err as Error).message } : i));
        }
    }, [productId, update]);

    // ── Add files to a zone ────────────────────────────────────────────────
    const addFiles = useCallback((rawFiles: File[], zone?: string) => {
        const passes: File[] = [];
        const blocked: string[] = [];

        for (const f of rawFiles) {
            if (!ACCEPT_TYPES.includes(f.type)) { blocked.push(`"${f.name}" không hợp lệ`); continue; }
            if (f.size > MAX_FILE_SIZE) { blocked.push(`"${f.name}" > 5MB`); continue; }
            passes.push(f);
        }
        if (blocked.length) toast(blocked.join(' · '), 'error');
        if (!passes.length) return;

        const newImgs: ProductImageState[] = passes.map(f => ({
            id: uid(), file: f, url: URL.createObjectURL(f),
            isPrimary: false, associatedAttributeValue: zone, status: 'uploading',
        }));

        // Auto-primary: first general image if none set
        update(p => {
            const hasPrimary = p.some(i => i.isPrimary);
            const enriched = newImgs.map((img, idx) => ({
                ...img,
                isPrimary: !hasPrimary && !zone && idx === 0,
            }));
            return [...p, ...enriched];
        });

        let done = 0;
        passes.forEach((f, idx) => {
            uploadFile(newImgs[idx].id, f, zone).then(() => {
                if (++done === passes.length) toast(`Tải lên ${passes.length} ảnh thành công.`, 'success');
            });
        });
    }, [update, uploadFile, toast]);

    // ── Set primary ────────────────────────────────────────────────────────
    const setPrimary = useCallback(async (id: string) => {
        const img = images.find(i => i.id === id);
        if (!img) return;
        update(p => p.map(i => ({ ...i, isPrimary: i.id === id })));

        if (productId && img.dbImageId) {
            try {
                const r = await fetch(
                    `${API_BASE_URL}/api/products/${productId}/images/${img.dbImageId}/primary`,
                    { method: 'PATCH', credentials: 'include' }
                );
                if (!r.ok) throw new Error();
                toast('Đã cập nhật ảnh bìa thành công', 'success');
            } catch {
                // rollback
                update(p => p.map(i => ({
                    ...i, isPrimary: initialImages.find(ii => ii.id === i.id)?.isPrimary ?? false,
                })));
                toast('Không thể cập nhật ảnh bìa', 'error');
            }
        } else {
            toast('Đã cập nhật ảnh bìa thành công', 'success');
        }
    }, [images, productId, update, toast, initialImages]);

    // ── Remove image ───────────────────────────────────────────────────────
    const removeImage = useCallback(async (id: string) => {
        const img = images.find(i => i.id === id);
        if (productId && img?.dbImageId) {
            await fetch(`${API_BASE_URL}/api/products/images/${img.dbImageId}`, {
                method: 'DELETE', credentials: 'include',
            }).catch(() => {/* swallow */ });
        }
        update(p => {
            const f = p.filter(i => i.id !== id);
            if (p.find(i => i.id === id)?.isPrimary) {
                const first = f.find(i => !i.associatedAttributeValue);
                if (first) return f.map(i => ({ ...i, isPrimary: i.id === first.id }));
            }
            return f;
        });
    }, [images, productId, update]);

    // ── DnD Zone-A reorder ─────────────────────────────────────────────────
    const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        update(p => {
            const o = p.findIndex(i => i.id === active.id);
            const n = p.findIndex(i => i.id === over.id);
            return arrayMove(p, o, n);
        });
    }, [update]);

    // ── Derived ────────────────────────────────────────────────────────────
    const generalImages = images.filter(i => !i.associatedAttributeValue);

    let attrGroups: string[];
    let primaryAttrName: string;
    if (attributeGroups?.length) {
        // Find the group corresponding to the primary attribute name across variants
        const colorAttr = variants[0]?.combination.find(c => c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color');
        const expectedPrimaryName = colorAttr?.attr ?? variants[0]?.combination[0]?.attr;
        const primaryGroup = expectedPrimaryName
            ? attributeGroups.find(g => g.name === expectedPrimaryName)
            : attributeGroups.find(g => g.name.trim() && g.values.length);

        attrGroups = primaryGroup?.values ?? [];
        primaryAttrName = primaryGroup?.name ?? '';
    } else {
        attrGroups = getPrimaryAttrGroups(variants);
        // Prefer the color attribute name; fall back to first attr
        const colorAttr = variants[0]?.combination.find(c => c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color');
        primaryAttrName = colorAttr?.attr ?? variants[0]?.combination[0]?.attr ?? '';
    }

    const totalCount = images.length;
    const uploadingCnt = images.filter(i => i.status === 'uploading').length;
    const errorCnt = images.filter(i => i.status === 'error').length;

    return (
        <>
            <ToastList toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />

            <div style={VN_FONT} className="space-y-5">

                {/* ══ Header bar ══════════════════════════════════════════════ */}
                <div className="flex items-center gap-2.5">
                    <ImageIcon size={14} className="text-primary/70" />
                    <h3 className="text-sm font-bold text-white">Quản lý hình ảnh</h3>
                    {totalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10
                                         text-[10px] font-semibold text-white/50">
                            {totalCount} ảnh
                        </span>
                    )}
                    {uploadingCnt > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/70">
                            <Loader2 size={10} className="animate-spin" />
                            Đang tải {uploadingCnt}…
                        </span>
                    )}
                    {errorCnt > 0 && (
                        <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                            <AlertCircle size={10} /> {errorCnt} lỗi
                        </span>
                    )}
                    {!productId && totalCount > 0 && (
                        <span className="ml-auto text-[10px] text-white/30 bg-white/[0.03] border
                                         border-white/[0.06] rounded-full px-2 py-0.5">
                            Sẽ tải lên sau khi tạo sản phẩm
                        </span>
                    )}
                </div>

                {/* ══ ZONE A — Ảnh chung ══════════════════════════════════════ */}
                <div className="rounded-2xl border border-white/[0.07] overflow-hidden">

                    {/* Zone A header */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.025] border-b border-white/[0.05]">
                        <div className="w-5 h-5 rounded-lg bg-blue-500/20 border border-blue-500/30
                                         flex items-center justify-center shrink-0">
                            <ImageIcon size={10} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-bold text-white">Ảnh chung</span>
                            <span className="text-[10px] text-white/30 ml-2">
                                Hiển thị mặc định khi chưa chọn phân loại
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {generalImages.length > 0 && (
                                <span className="text-[10px] text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                    {generalImages.filter(i => i.status === 'done').length} ảnh
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium
                                           bg-blue-500/10 hover:bg-blue-500/20 text-blue-400/80 hover:text-blue-300
                                           border border-blue-500/20 hover:border-blue-400/30 transition-colors cursor-pointer"
                            >
                                <Plus size={10} /> Thêm ảnh
                            </button>
                        </div>
                    </div>

                    {/* Zone A content */}
                    <div className="p-5 space-y-4">

                        {/* Global dropzone */}
                        <div
                            role="button" tabIndex={0}
                            onClick={() => inputRef.current?.click()}
                            onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                            onDragEnter={e => { e.preventDefault(); setDropActive(true); }}
                            onDragLeave={e => { e.preventDefault(); setDropActive(false); }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault(); setDropActive(false);
                                addFiles(Array.from(e.dataTransfer.files));
                            }}
                            className={`flex items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4
                                        cursor-pointer transition-colors duration-200 select-none
                                        ${dropActive
                                    ? 'border-blue-400 bg-blue-500/10 scale-[1.005]'
                                    : 'border-white/10 hover:border-blue-500/30 hover:bg-white/[0.02]'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                                            ${dropActive ? 'bg-blue-500/20' : 'bg-white/[0.04]'}`}>
                                <Upload size={18} className={dropActive ? 'text-blue-400' : 'text-white/30'} />
                            </div>
                            <div>
                                <p className={`text-[13px] font-medium transition-colors
                                    ${dropActive ? 'text-blue-300' : 'text-white/55'}`}>
                                    Kéo thả ảnh vào đây, hoặc nhấn để tải lên
                                </p>
                                <p className="text-[11px] text-white/25 mt-0.5">
                                    Tối đa 5MB/ảnh · JPG · PNG · WebP · GIF
                                </p>
                            </div>
                            <input ref={inputRef} type="file" accept={ACCEPT_TYPES.join(',')} multiple className="hidden"
                                onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                        </div>

                        {/* Zone A grid */}
                        {generalImages.length > 0 && (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={generalImages.map(i => i.id)} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {generalImages.map(img =>
                                            img.status === 'uploading' && !img.url.startsWith('blob:')
                                                ? <SkeletonCard key={img.id} />
                                                : <CardA key={img.id} img={img} onPrimary={setPrimary} onRemove={removeImage} />
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}

                        {/* Empty inner state */}
                        {generalImages.length === 0 && (
                            <p className="text-center text-[11px] text-white/20 py-1">
                                Chưa có ảnh chung. Kéo thả hoặc nhấn "Thêm ảnh" để bắt đầu.
                            </p>
                        )}

                        {/* Hint */}
                        {generalImages.length > 0 && (
                            <p className="text-[10px] text-white/20 flex items-center gap-1.5">
                                <Star size={9} className="text-yellow-400/60" />
                                Hover → click "Đặt làm ảnh bìa" để chọn thumbnail chính
                                <span className="mx-1 opacity-30">·</span>
                                <GripVertical size={9} />
                                Kéo để sắp xếp thứ tự
                            </p>
                        )}
                    </div>
                </div>

                {/* ══ ZONE B — Ảnh theo phân loại ════════════════════════════ */}
                {attrGroups.length > 0 && (
                    <div className="space-y-3">

                        {/* Zone B title bar */}
                        <div className="flex items-center gap-2">
                            <Layers size={13} className="text-emerald-400/70" />
                            <h4 className="text-[12px] font-bold text-white/80">
                                Ảnh theo phân loại
                            </h4>
                            <span className="text-[10px] text-white/30">
                                (nhóm theo <span className="text-white/50">{primaryAttrName || 'thuộc tính chính'}</span>)
                            </span>
                            <span className="ml-auto text-[10px] text-white/30">
                                {attrGroups.length} nhóm
                            </span>
                        </div>

                        {/* Info banner */}
                        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl
                                        bg-emerald-500/[0.06] border border-emerald-500/15">
                            <MoveRight size={13} className="text-emerald-400/60 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-emerald-400/70 leading-relaxed">
                                Mỗi ảnh tải vào đây sẽ tự động gắn với{' '}
                                <strong>tất cả biến thể</strong> có cùng{' '}
                                {primaryAttrName || 'thuộc tính chính'} —
                                không cần upload riêng cho từng size.
                            </p>
                        </div>

                        {/* One row per variant value */}
                        {attrGroups.map(attrVal => {
                            // Count variants that have this color value in any position
                            const variantCount = variants.filter(v =>
                                v.combination.some(c =>
                                    (c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color') && c.value === attrVal
                                ) || (!v.combination.some(c => c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color') && v.combination[0]?.value === attrVal)
                            ).length;
                            const zoneImages = images.filter(i => i.associatedAttributeValue === attrVal);
                            return (
                                <ZoneBRow
                                    key={attrVal}
                                    attrVal={attrVal}
                                    variantCount={variantCount}
                                    images={zoneImages}
                                    onRemove={removeImage}
                                    onAddFiles={addFiles}
                                />
                            );
                        })}
                    </div>
                )}

                {/* ══ Global empty state ══════════════════════════════════════ */}
                {totalCount === 0 && (
                    <p className="text-center py-1 text-[11px] text-white/20">
                        Kéo thả ảnh vào vùng "Ảnh chung" phía trên để bắt đầu.
                    </p>
                )}

            </div>
        </>
    );
};

export default ProductImageManager;
