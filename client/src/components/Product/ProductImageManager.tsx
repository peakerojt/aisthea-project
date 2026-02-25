/**
 * ProductImageManager — Two-zone image management component
 *
 * Zone A: Ảnh chung (General Gallery) — VariantId = null
 * Zone B: Ảnh theo phân loại (Variant Gallery) — grouped by first attribute value
 *
 * Upload flow: File → compress → POST /api/products/:productId/image (backend → Cloudinary)
 * In CREATE mode (no productId yet): store as local File → parent handles upload post-creation
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    Star, Trash2, Upload, ImageIcon, Loader2, CheckCircle2,
    AlertCircle, X, Plus, Layers, Image as ImgIcon,
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';
import { compressImage } from '../../utils/imageCompression';
import { getColorEmoji } from '../../utils/groupVariantsHelper';
import type { VariantRow } from '../Product/VariantManager';

// ─── Constants ────────────────────────────────────────────────────────────────
const VN_FONT: React.CSSProperties = { fontFamily: "'Be Vietnam Pro', sans-serif" };
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductImageState {
    /** Internal unique key */
    id: string;
    /** Raw file — present for NEW images before upload */
    file?: File;
    /** Cloudinary public_id — present after upload */
    publicId?: string;
    /** Preview or final Cloudinary URL */
    url: string;
    /** Only one image can be isPrimary=true across the whole manager */
    isPrimary: boolean;
    /**
     * For Zone B images: the first-attribute value this image represents
     * e.g. "Đỏ" — links this image to all variants with combination[0].value === "Đỏ"
     */
    associatedAttributeValue?: string;
    /** Upload status */
    status: 'idle' | 'uploading' | 'done' | 'error';
    errorMsg?: string;
}

export interface ProductImageManagerProps {
    /**
     * If provided: images are uploaded immediately to the server.
     * If undefined (Create mode): images are queued locally; parent must handle upload.
     */
    productId?: number;
    /** Current variant rows (to derive group keys for Zone B) */
    variants: VariantRow[];
    /**
     * Optional explicit attribute groups — used in Create mode where variants may
     * not yet be generated from the Cartesian product.
     * When provided, takes priority over variant-derived groups for Zone B display.
     */
    attributeGroups?: { name: string; values: string[] }[];
    /** Pre-loaded images (for Edit mode) */
    initialImages?: ProductImageState[];
    /** Notifies parent whenever state changes */
    onChange: (images: ProductImageState[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — derive unique primary-attribute values from variants
// ─────────────────────────────────────────────────────────────────────────────
function getPrimaryAttrGroups(variants: VariantRow[]): string[] {
    const seen = new Set<string>();
    for (const v of variants) {
        const primary = v.combination[0]?.value;
        if (primary && !seen.has(primary)) seen.add(primary);
    }
    return Array.from(seen);
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageCard sub-component (outside .map() — no hooks violation)
// ─────────────────────────────────────────────────────────────────────────────
interface ImageCardProps {
    img: ProductImageState;
    onSetPrimary: (id: string) => void;
    onRemove: (id: string) => void;
    showPrimaryBadge?: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({ img, onSetPrimary, onRemove, showPrimaryBadge = true }) => (
    <div className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${img.isPrimary
        ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
        : img.status === 'error'
            ? 'border-red-500/40'
            : 'border-white/10 hover:border-white/30'
        }`} style={{ width: 96, height: 112 }}>
        {/* Image */}
        <img
            src={img.url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
        />

        {/* Upload overlay */}
        {img.status === 'uploading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 size={20} className="animate-spin text-white" />
            </div>
        )}

        {img.status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-1 text-center">
                <AlertCircle size={16} className="text-red-400 mb-1" />
                <span className="text-[9px] text-red-300 leading-tight">
                    {img.errorMsg || 'Lỗi upload'}
                </span>
            </div>
        )}

        {/* Primary badge */}
        {img.isPrimary && img.status !== 'uploading' && (
            <div className="absolute top-1 left-1 bg-yellow-400 rounded-full p-0.5">
                <Star size={9} fill="currentColor" className="text-black" />
            </div>
        )}

        {/* Done badge */}
        {img.status === 'done' && !img.isPrimary && (
            <div className="absolute top-1 left-1 bg-emerald-500 rounded-full p-0.5 opacity-70">
                <CheckCircle2 size={9} className="text-white" />
            </div>
        )}

        {/* Hover actions */}
        {img.status !== 'uploading' && (
            <div className="absolute inset-0 flex flex-col items-stretch justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                {showPrimaryBadge && !img.isPrimary && (
                    <button
                        type="button"
                        onClick={() => onSetPrimary(img.id)}
                        title="Đặt làm ảnh đại diện"
                        className="bg-black/70 py-0.5 text-[9px] text-white/80 hover:text-yellow-400 text-center transition-colors flex items-center justify-center gap-0.5"
                    >
                        <Star size={9} /> Đại diện
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onRemove(img.id)}
                    className="bg-red-700/80 hover:bg-red-600/90 py-0.5 text-[9px] text-white text-center transition-colors flex items-center justify-center gap-0.5"
                >
                    <Trash2 size={9} /> Xóa
                </button>
            </div>
        )}
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DropZone sub-component — drag & drop area with NO extra dependency
// ─────────────────────────────────────────────────────────────────────────────
interface DropZoneProps {
    onFiles: (files: File[]) => void;
    compact?: boolean;
    label?: string;
    disabled?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({
    onFiles, compact = false, label = 'Kéo & thả ảnh vào đây\nhoặc click để chọn tệp', disabled = false,
}) => {
    const [over, setOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const acceptFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const valid = Array.from(fileList).filter(f => ACCEPT_TYPES.includes(f.type));
        if (valid.length) onFiles(valid);
    };

    return (
        <div
            onClick={() => !disabled && inputRef.current?.click()}
            onDragEnter={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={e => { e.preventDefault(); setOver(false); }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
                e.preventDefault(); setOver(false);
                if (!disabled) acceptFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer select-none transition-all ${over
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : disabled
                    ? 'border-white/5 cursor-not-allowed opacity-40'
                    : 'border-white/15 hover:border-primary/50 hover:bg-white/[0.02]'
                } ${compact ? 'p-4' : 'px-6 py-8'}`}
        >
            <Upload size={compact ? 18 : 24} className={`${over ? 'text-primary' : 'text-white/30'} transition-colors`} />
            {label.split('\n').map((line, i) => (
                <span key={i} className={`text-center ${compact ? 'text-[10px]' : 'text-xs'} text-white/40 leading-tight`}>
                    {line}
                </span>
            ))}
            <span className="text-[9px] text-white/20">JPG · PNG · WebP · GIF</span>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={e => acceptFiles(e.target.files)}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductImageManager — Main component
// ─────────────────────────────────────────────────────────────────────────────

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
    productId, variants, attributeGroups, initialImages = [], onChange,
}) => {
    const [images, setImages] = useState<ProductImageState[]>(initialImages);

    // ── Internal state mutator (always calls onChange) ───────────────────────
    const updateImages = useCallback((updater: (prev: ProductImageState[]) => ProductImageState[]) => {
        setImages(prev => {
            const next = updater(prev);
            onChange(next);
            return next;
        });
    }, [onChange]);

    // ── Upload single file to backend (if productId known) ───────────────────
    const uploadFile = useCallback(async (
        tempId: string,
        file: File,
        associatedAttributeValue?: string,
    ) => {
        // Compress first
        const { file: compressed } = await compressImage(file);

        // If no productId (create mode), mark as local/idle — parent queues upload
        if (!productId) {
            updateImages(prev => prev.map(img =>
                img.id === tempId
                    ? { ...img, file: compressed, status: 'idle' }
                    : img
            ));
            return;
        }

        // Mark uploading
        updateImages(prev => prev.map(img =>
            img.id === tempId ? { ...img, status: 'uploading' } : img
        ));

        try {
            const fd = new FormData();
            fd.append('file', compressed);
            fd.append('isPrimary', 'false');
            if (associatedAttributeValue) {
                fd.append('associatedAttributeValue', associatedAttributeValue);
            }

            const res = await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            if (!res.ok) throw new Error(`Upload thất bại (${res.status})`);
            const data = await res.json();

            updateImages(prev => prev.map(img =>
                img.id === tempId
                    ? {
                        ...img,
                        status: 'done',
                        url: data.imageUrl ?? img.url,
                        publicId: data.publicId,
                        file: undefined,
                    }
                    : img
            ));
        } catch (err: any) {
            updateImages(prev => prev.map(img =>
                img.id === tempId
                    ? { ...img, status: 'error', errorMsg: err.message }
                    : img
            ));
        }
    }, [productId, updateImages]);

    // ── Handle new files dropped/selected ────────────────────────────────────
    const handleNewFiles = useCallback((
        files: File[],
        associatedAttributeValue?: string,
    ) => {
        const newImgs: ProductImageState[] = files.map(f => ({
            id: Math.random().toString(36).slice(2),
            file: f,
            url: URL.createObjectURL(f),
            isPrimary: false,
            associatedAttributeValue,
            status: 'uploading' as const,
        }));

        // Auto-mark first general image as primary if none set
        updateImages(prev => {
            const hasPrimary = prev.some(i => i.isPrimary);
            const enriched = newImgs.map((img, idx) => ({
                ...img,
                isPrimary: !hasPrimary && !associatedAttributeValue && idx === 0,
            }));
            return [...prev, ...enriched];
        });

        // Trigger uploads
        newImgs.forEach(img => {
            uploadFile(img.id, img.file!, associatedAttributeValue);
        });
    }, [updateImages, uploadFile]);

    // ── Set primary ───────────────────────────────────────────────────────────
    const setPrimary = (id: string) =>
        updateImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === id })));

    // ── Remove image ──────────────────────────────────────────────────────────
    const removeImage = (id: string) =>
        updateImages(prev => {
            const filtered = prev.filter(i => i.id !== id);
            // If we removed primary, auto-promote first general image
            const hadPrimary = prev.find(i => i.id === id)?.isPrimary;
            if (hadPrimary) {
                const firstGeneral = filtered.find(i => !i.associatedAttributeValue);
                if (firstGeneral) return filtered.map(i => ({ ...i, isPrimary: i.id === firstGeneral.id }));
            }
            return filtered;
        });

    // ── Derived state ─────────────────────────────────────────────────────────
    const generalImages = images.filter(i => !i.associatedAttributeValue);

    // If explicit attributeGroups provided (Create mode), derive Zone B from first group.
    // Otherwise fall back to deriving from variants (Edit mode).
    let attrGroups: string[];
    let primaryAttrName: string;
    if (attributeGroups && attributeGroups.length > 0) {
        const first = attributeGroups.find(g => g.name.trim() && g.values.length > 0);
        attrGroups = first?.values ?? [];
        primaryAttrName = first?.name ?? '';
    } else {
        attrGroups = getPrimaryAttrGroups(variants);
        primaryAttrName = variants[0]?.combination[0]?.attr ?? '';
    }
    const hasVariantGroups = attrGroups.length > 0;

    // Images per attribute group
    const imagesByGroup = (attrVal: string) =>
        images.filter(i => i.associatedAttributeValue === attrVal);

    const totalCount = images.length;
    const uploadingCount = images.filter(i => i.status === 'uploading').length;
    const errorCount = images.filter(i => i.status === 'error').length;

    return (
        <div style={VN_FONT} className="space-y-5">

            {/* ── Section header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ImgIcon size={15} className="text-primary/70" />
                    <h3 className="text-sm font-bold text-white">Hình ảnh sản phẩm</h3>
                    {totalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-white/50">
                            {totalCount} ảnh
                        </span>
                    )}
                    {uploadingCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-primary/70">
                            <Loader2 size={10} className="animate-spin" />
                            Đang tải {uploadingCount}...
                        </span>
                    )}
                    {errorCount > 0 && (
                        <span className="text-[10px] text-red-400">
                            ⚠ {errorCount} lỗi
                        </span>
                    )}
                </div>
                {!productId && totalCount > 0 && (
                    <span className="text-[10px] text-white/30 bg-white/[0.03] border border-white/8 rounded-full px-2 py-0.5">
                        Ảnh sẽ được tải lên sau khi tạo sản phẩm
                    </span>
                )}
            </div>

            {/* ══ ZONE A: Ảnh chung ═══════════════════════════════════════ */}
            <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                {/* Zone A Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.025] border-b border-white/[0.05]">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                        <ImageIcon size={10} className="text-blue-400" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-white">Ảnh chung của sản phẩm</span>
                        <span className="text-[10px] text-white/30 ml-2">(Hiển thị khi chưa chọn phân loại)</span>
                    </div>
                    <span className="ml-auto text-[10px] text-white/30">{generalImages.length} ảnh</span>
                </div>

                <div className="p-4 space-y-4">
                    {/* Thumbnail grid */}
                    {generalImages.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {generalImages.map(img => (
                                <ImageCard
                                    key={img.id}
                                    img={img}
                                    onSetPrimary={setPrimary}
                                    onRemove={removeImage}
                                    showPrimaryBadge={true}
                                />
                            ))}
                        </div>
                    )}

                    {/* Drop zone A */}
                    <DropZone
                        onFiles={files => handleNewFiles(files, undefined)}
                        compact={generalImages.length > 0}
                        label={generalImages.length === 0
                            ? 'Kéo & thả ảnh sản phẩm vào đây\nhoặc click để chọn từ máy tính'
                            : 'Thêm ảnh chung'}
                    />

                    {/* Primary hint */}
                    {generalImages.length > 0 && (
                        <p className="text-[10px] text-white/30 flex items-center gap-1">
                            <Star size={9} className="text-yellow-400" />
                            Hover ảnh → click "Đại diện" để đặt ảnh thumbnail chính
                        </p>
                    )}
                </div>
            </div>

            {/* ══ ZONE B: Ảnh theo phân loại ══════════════════════════════ */}
            {hasVariantGroups && (
                <div className="border border-white/[0.07] rounded-xl overflow-hidden">
                    {/* Zone B Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.025] border-b border-white/[0.05]">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Layers size={10} className="text-emerald-400" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-white">Ảnh theo phân loại</span>
                            <span className="text-[10px] text-white/30 ml-2">
                                (Nhóm theo <span className="text-white/50">{primaryAttrName || 'thuộc tính chính'}</span>)
                            </span>
                        </div>
                        <span className="ml-auto text-[10px] text-white/30">
                            {attrGroups.length} nhóm
                        </span>
                    </div>

                    {/* Info banner */}
                    <div className="px-4 py-2 bg-emerald-500/5 border-b border-white/[0.03]">
                        <p className="text-[10px] text-emerald-400/70">
                            💡 Mỗi ảnh bạn tải lên đây sẽ tự động gắn với <strong>tất cả biến thể</strong> có cùng{' '}
                            {primaryAttrName || 'thuộc tính chính'}. Bạn không cần upload riêng cho từng size.
                        </p>
                    </div>

                    {/* Group rows */}
                    <div className="divide-y divide-white/[0.04]">
                        {attrGroups.map(attrVal => {
                            const groupImgs = imagesByGroup(attrVal);
                            const emoji = getColorEmoji(attrVal);
                            const variantCount = variants.filter(v => v.combination[0]?.value === attrVal).length;

                            return (
                                <div key={attrVal} className="px-4 py-4 space-y-3">
                                    {/* Group header */}
                                    <div className="flex items-center gap-2">
                                        {emoji && <span className="text-sm leading-none">{emoji}</span>}
                                        <span className="text-sm font-semibold text-white">{attrVal}</span>
                                        <span className="text-[10px] text-white/30">
                                            · {variantCount} biến thể · {groupImgs.length} ảnh
                                        </span>
                                    </div>

                                    {/* Group images + upload zone in one row */}
                                    <div className="flex flex-wrap gap-2 items-start">
                                        {groupImgs.map(img => (
                                            <ImageCard
                                                key={img.id}
                                                img={img}
                                                onSetPrimary={setPrimary}
                                                onRemove={removeImage}
                                                showPrimaryBadge={false}
                                            />
                                        ))}

                                        {/* Compact inline drop zone */}
                                        <div
                                            style={{ width: 96, height: 112 }}
                                            className="group flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-white/[0.02] cursor-pointer transition-all"
                                            onClick={() => {
                                                const el = document.getElementById(`zone-b-input-${attrVal}`);
                                                el?.click();
                                            }}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => {
                                                e.preventDefault();
                                                const files = Array.from(e.dataTransfer.files).filter(f => ACCEPT_TYPES.includes(f.type));
                                                if (files.length) handleNewFiles(files, attrVal);
                                            }}
                                        >
                                            <Plus size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                                            <span className="text-[9px] text-white/25 group-hover:text-white/50 transition-colors text-center leading-tight px-1">
                                                Thêm ảnh<br />{attrVal}
                                            </span>
                                            <input
                                                id={`zone-b-input-${attrVal}`}
                                                type="file"
                                                accept={ACCEPT_TYPES.join(',')}
                                                multiple
                                                className="hidden"
                                                onChange={e => {
                                                    const files = Array.from(e.target.files ?? []).filter(f => ACCEPT_TYPES.includes(f.type));
                                                    if (files.length) handleNewFiles(files, attrVal);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Empty state ────────────────────────────────────────────── */}
            {totalCount === 0 && (
                <div className="text-center py-4 text-[11px] text-white/25">
                    Chưa có hình ảnh. Kéo thả hoặc click "Ảnh chung" để bắt đầu.
                </div>
            )}
        </div>
    );
};

export default ProductImageManager;
