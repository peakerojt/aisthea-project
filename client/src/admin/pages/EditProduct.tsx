import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useBeforeUnload } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    fetchProductForEdit,
    updateProduct,
    fetchCategories,
    fetchBrands,
    ProductForEdit,
    ExistingVariant,
    UpdateVariantPayload,
} from '@/common/services/product.service';
import type { CategoryOption, BrandOption } from '@/common/services/product.service';
import { API_BASE_URL } from '@/common/utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/common/hooks/useProducts';
import {
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminIconButton,
    AdminModalShell,
    AdminSecondaryButton,
    AdminSectionCard,
} from '@/admin/components/AdminUI';
import VariantManager from '@/admin/components/VariantManager';
import type { AttributeGroup as VMGroup, VariantRow as VMRow } from '@/admin/components/VariantManager';
import ProductImageManager from '@/admin/components/ProductImageManager';
import type { ProductImageState } from '@/admin/components/ProductImageManager';
import {
    Upload, X, Star, CheckCircle2, AlertCircle,
    ChevronRight, Trash2, Tag,
    ArrowLeft, Loader2, Image as ImageIcon, Save,
} from 'lucide-react';

// ─── Font ─────────────────────────────────────────────────────────────────────
const VN_FONT: React.CSSProperties = { fontFamily: "'Be Vietnam Pro', sans-serif" };

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const schema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
    description: z.string().optional(),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    brandId: z.string().optional(),
    basePrice: z.string().min(1, 'Vui lòng nhập giá sản phẩm'),
    baseSku: z.string().optional(),
    status: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Local Types ──────────────────────────────────────────────────────────────
interface AttributeGroup {
    id: number;
    name: string;
    values: string[];
}

interface VariantRow {
    id: string;
    variantId?: number;        // undefined = new, number = existing DB row
    label: string;
    combination: { attr: string; value: string }[];
    sku: string;
    price: string;
    stock: string;
}

interface ExistingImage {
    imageId: number;
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
    markedForDelete: boolean;
}

interface NewLocalImage {
    id: string;
    file: File;
    previewUrl: string;
    isPrimary: boolean;
    uploading: boolean;
}

interface ToastMsg {
    id: string;
    type: 'success' | 'error';
    text: string;
}

type PendingNavigation = (() => void) | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSlug = (s: string) =>
    s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

function cartesian(groups: AttributeGroup[]): { attr: string; value: string }[][] {
    const valid = groups.filter(g => g.name.trim() && g.values.length > 0);
    if (!valid.length) return [];
    return valid.reduce<{ attr: string; value: string }[][]>(
        (acc, g) => acc.flatMap(combo => g.values.map(v => [...combo, { attr: g.name, value: v }])),
        [[]]
    );
}

/** Transform flat DB variant list → AttributeGroups + VariantRows */
function buildFormState(variants: ExistingVariant[]): {
    groups: AttributeGroup[];
    rows: VariantRow[];
} {
    if (!variants.length) {
        return { groups: [{ id: Date.now(), name: '', values: [] }], rows: [] };
    }

    // Collect unique attribute names and their values
    const attrMap = new Map<string, Set<string>>();
    variants.forEach(v => {
        v.variantAttributes.forEach(va => {
            const attrName = va.value.attribute.name;
            if (!attrMap.has(attrName)) attrMap.set(attrName, new Set());
            attrMap.get(attrName)!.add(va.value.value);
        });
    });

    const groups: AttributeGroup[] = Array.from(attrMap.entries()).map(([name, vals], i) => ({
        id: Date.now() + i,
        name,
        values: Array.from(vals),
    }));

    const rows: VariantRow[] = variants.map(v => {
        const combination = v.variantAttributes.map(va => ({
            attr: va.value.attribute.name,
            value: va.value.value,
        }));
        const label = combination.map(c => c.value).join(' / ') || `Variant ${v.variantId}`;
        return {
            id: `existing-${v.variantId}`,
            variantId: v.variantId,
            label,
            combination,
            sku: v.sku,
            price: String(Number(v.price)),
            stock: String(v.stockQuantity),
        };
    });

    return { groups, rows };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white/5 rounded animate-pulse ${className}`} />
);

const EditSkeleton = () => (
    <div className="flex flex-col h-full bg-bg-dark p-8" style={VN_FONT}>
        <div className="flex items-center gap-3 mb-8">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-64 h-8" />
        </div>
        <div className="grid grid-cols-[1fr_320px] gap-6 flex-1">
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface-dark rounded-xl p-6 border border-white/5 space-y-4">
                        <Skeleton className="w-40 h-5" />
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-24" />
                    </div>
                ))}
            </div>
            <div className="space-y-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-surface-dark rounded-xl p-6 border border-white/5 space-y-4">
                        <Skeleton className="w-32 h-5" />
                        <Skeleton className="w-full h-10" />
                        <Skeleton className="w-full h-10" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);


// ─── GroupRow sub-component (must NOT be inside .map() to respect Rules of Hooks) ─
interface GroupRowProps {
    group: AttributeGroup;
    onUpdateName: (id: number, name: string) => void;
    onAddValue: (id: number, val: string) => void;
    onRemoveValue: (id: number, val: string) => void;
    onRemoveGroup: (id: number) => void;
}

const GroupRow: React.FC<GroupRowProps> = ({
    group, onUpdateName, onAddValue, onRemoveValue, onRemoveGroup,
}) => {
    const [inputVal, setInputVal] = useState('');
    return (
        <div className="border border-white/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
                <input
                    value={group.name}
                    onChange={e => onUpdateName(group.id, e.target.value)}
                    placeholder="VD: Màu sắc"
                    className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
                />
                <button type="button" onClick={() => onRemoveGroup(group.id)}
                    className="p-2 text-white/30 hover:text-red-400 transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {group.values.map(val => (
                    <span key={val} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white">
                        {val}
                        <button type="button" onClick={() => onRemoveValue(group.id, val)}
                            className="text-white/40 hover:text-red-400 ml-1">
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            onAddValue(group.id, inputVal);
                            setInputVal('');
                        }
                    }}
                    placeholder="..."
                    className="bg-transparent border-b border-white/10 focus:border-primary text-xs text-white outline-none px-1 py-1 min-w-[120px]"
                />
            </div>
        </div>
    );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    productId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const EditProduct: React.FC<Props> = ({ productId }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const resolvedProductId = id ? Number(id) : productId ?? 0;
    const { t } = useTranslation(['products']);
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        getValues,
        formState: { errors, isDirty },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { status: 'Active' },
    });

    // ─── Meta ────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [brands, setBrands] = useState<BrandOption[]>([]);

    // ─── Product load state ───────────────────────────────────────────────
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [productName, setProductNameState] = useState('');
    const [currentSlug, setCurrentSlug] = useState('');

    // ─── Slug ────────────────────────────────────────────────────────────
    const watchedName = watch('name', '');
    const slugPreview = watchedName ? toSlug(watchedName) : currentSlug;

    // ─── VariantManager state ──────────────────────────────────────────────
    // initialGroups/initialVariants are populated after product load
    const [vmInitialGroups, setVmInitialGroups] = useState<VMGroup[] | undefined>(undefined);
    const [vmInitialVariants, setVmInitialVariants] = useState<VMRow[] | undefined>(undefined);
    // live variants from the VariantManager (updated via onChange)
    const [variants, setVariants] = useState<VMRow[]>([]);

    const handleVariantChange = useCallback((rows: VMRow[]) => {
        setVariants(rows);
        setFormDirty(true);
    }, []);

    // ─── ProductImageManager state ───────────────────────────────────────────
    const [managedImages, setManagedImages] = useState<ProductImageState[]>([]);
    const [imInitialized, setImInitialized] = useState(false);

    const handleImagesChange = useCallback((imgs: ProductImageState[]) => {
        setManagedImages(imgs);
        setFormDirty(true);
    }, []);

    // ─── Existing images (legacy — kept for submit compat) ──────────────────────────
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [newImages, setNewImages] = useState<NewLocalImage[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [draggedNewIdx, setDraggedNewIdx] = useState<number | null>(null);

    // ─── UI State ────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const [formDirty, setFormDirty] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);

    // ─── Load data ───────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            fetchProductForEdit(resolvedProductId),
            fetchCategories(),
            fetchBrands(),
        ]).then(([product, cats, brnds]) => {
            setCategories(cats);
            setBrands(brnds);
            setProductNameState(product.name);
            setCurrentSlug(product.slug);

            // Populate form fields
            reset({
                name: product.name,
                description: product.description || '',
                categoryId: String(product.categoryId),
                brandId: product.brandId ? String(product.brandId) : '',
                basePrice: String(Number(product.basePrice)),
                baseSku: '',
                status: product.status || 'Active',
            });

            // Populate images — convert to ProductImageState for ProductImageManager
            // Build variantId → first-attribute-color-value map from product.variants
            const variantColorMap = new Map<number, string>();
            for (const v of product.variants) {
                const colorAttr = v.variantAttributes.find(
                    va => va.value.attribute.name === 'Màu sắc'
                ) ?? v.variantAttributes[0]; // fallback to first attribute
                if (colorAttr) {
                    variantColorMap.set(v.variantId, colorAttr.value.value);
                }
            }

            // Separate and deduplicate images:
            // - variantId=null → Zone A (common)
            // - variantId set → Zone B (variant-specific), deduplicated by (colorValue+imageUrl)
            const commonImages: ProductImageState[] = [];
            const variantImagesSeen = new Set<string>();
            const variantImages: ProductImageState[] = [];

            for (const img of product.images) {
                if (!img.variantId) {
                    // Zone A: common image
                    commonImages.push({
                        id: String(img.imageId),
                        url: img.thumbnailUrl || img.imageUrl,
                        isPrimary: img.isPrimary,
                        status: 'done' as const,
                        publicId: undefined,
                    });
                } else {
                    // Zone B: variant-specific image
                    const colorValue = variantColorMap.get(img.variantId);
                    if (colorValue) {
                        const dedupeKey = `${colorValue}||${img.imageUrl}`;
                        if (!variantImagesSeen.has(dedupeKey)) {
                            variantImagesSeen.add(dedupeKey);
                            variantImages.push({
                                id: String(img.imageId),
                                url: img.thumbnailUrl || img.imageUrl,
                                isPrimary: false,
                                associatedAttributeValue: colorValue,
                                status: 'done' as const,
                                publicId: undefined,
                            });
                        }
                    }
                }
            }

            const converted: ProductImageState[] = [...commonImages, ...variantImages];
            setManagedImages(converted);
            setImInitialized(true);

            // Also populate legacy existingImages for the submit handler
            setExistingImages(
                product.images.map(img => ({
                    imageId: img.imageId,
                    imageUrl: img.imageUrl,
                    thumbnailUrl: img.thumbnailUrl,
                    isPrimary: img.isPrimary,
                    markedForDelete: false,
                }))
            );

            // Reconstruct variant matrix for VariantManager
            const { groups: g, rows: r } = buildFormState(product.variants);
            setVmInitialGroups(g);
            setVmInitialVariants(r);
            setVariants(r);

            setLoadingProduct(false);
        }).catch(err => {
            setLoadError(err.message || t('editor.feedback.loadError'));
            setLoadingProduct(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedProductId]);

    // ─── Dirty state tracking ─────────────────────────────────────────────
    useEffect(() => {
        setFormDirty(isDirty);
    }, [isDirty]);

    const hasUnsavedChanges = formDirty || newImages.length > 0;

    useBeforeUnload(
        useCallback((event: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges || saving) return;
            event.preventDefault();
            event.returnValue = '';
        }, [hasUnsavedChanges, saving])
    );

    const attemptNavigation = useCallback((callback: () => void) => {
        if (hasUnsavedChanges && !saving) {
            setPendingNavigation(() => callback);
            setShowLeaveDialog(true);
            return;
        }

        callback();
    }, [hasUnsavedChanges, saving]);

    // ─── Toast ────────────────────────────────────────────────────────────
    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    // (Group/variant helpers moved into VariantManager component)

    // ─── Existing image helpers ───────────────────────────────────────────
    const toggleDeleteExisting = (imageId: number) => {
        setExistingImages(prev => prev.map(img =>
            img.imageId === imageId ? { ...img, markedForDelete: !img.markedForDelete } : img
        ));
        setFormDirty(true);
    };

    const setPrimaryExisting = (imageId: number) => {
        setExistingImages(prev => prev.map(img => ({ ...img, isPrimary: img.imageId === imageId })));
        setNewImages(prev => prev.map(img => ({ ...img, isPrimary: false })));
        setFormDirty(true);
    };

    // ─── New image helpers ────────────────────────────────────────────────
    const addFiles = (files: FileList | File[]) => {
        const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
        const newImgs: NewLocalImage[] = valid.map(f => ({
            id: Math.random().toString(36).slice(2),
            file: f,
            previewUrl: URL.createObjectURL(f),
            isPrimary: false,
            uploading: false,
        }));
        setNewImages(prev => [...prev, ...newImgs]);
        setFormDirty(true);
    };

    const removeNewImage = (id: string) =>
        setNewImages(prev => prev.filter(i => i.id !== id));

    const setPrimaryNew = (id: string) => {
        setNewImages(prev => prev.map(i => ({ ...i, isPrimary: i.id === id })));
        setExistingImages(prev => prev.map(img => ({ ...img, isPrimary: false })));
        setFormDirty(true);
    };

    const handleImgDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedNewIdx === null || draggedNewIdx === idx) return;
        setNewImages(prev => {
            const next = [...prev];
            const [item] = next.splice(draggedNewIdx, 1);
            next.splice(idx, 0, item);
            setDraggedNewIdx(idx);
            return next;
        });
    };

    // Upload single new image to backend
    const uploadNewImage = async (pid: number, img: NewLocalImage): Promise<void> => {
        const fd = new FormData();
        fd.append('file', img.file);
        fd.append('isPrimary', img.isPrimary ? 'true' : 'false');
        try {
            await fetch(`${API_BASE_URL}/api/products/${pid}/image`, {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
        } catch {
            // best-effort
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────
    const onSubmit = async (data: FormValues) => {
        if (variants.length === 0) {
            showToast('error', t('editor.feedback.noVariants'));
            return;
        }
        for (const v of variants) {
            if (!v.price || Number(v.price) <= 0) {
                showToast('error', t('editor.feedback.invalidPrice', { label: v.label }));
                return;
            }
        }

        setSaving(true);
        try {
            const deletedImageIds = existingImages
                .filter(img => img.markedForDelete)
                .map(img => img.imageId);

            const keptVariantIds = variants
                .filter(v => v.variantId !== undefined)
                .map(v => v.variantId!);

            const primaryExisting = existingImages.find(img => img.isPrimary && !img.markedForDelete);
            const primaryImageId = primaryExisting?.imageId;

            const variantPayloads: UpdateVariantPayload[] = variants.map((v, i) => ({
                variantId: v.variantId,
                sku: v.sku,
                price: Number(v.price),
                stockQuantity: Number(v.stock) || 0,
                isDefault: i === 0,
                attributeValues: v.combination.map(c => ({ attributeName: c.attr, value: c.value })),
            }));

            const updatedImages = managedImages
                .filter(img => !img.file && img.id)
                .map(img => ({
                    imageId: Number(img.id),
                    associatedAttributeValue: img.associatedAttributeValue,
                    isPrimary: img.isPrimary
                }));

            await updateProduct(resolvedProductId, {
                name: data.name,
                slug: slugPreview || currentSlug,
                description: data.description,
                basePrice: Number(data.basePrice),
                categoryId: Number(data.categoryId),
                brandId: data.brandId ? Number(data.brandId) : undefined,
                status: data.status || 'Active',
                deletedImageIds,
                newImages: [],   // will upload below
                updatedImages,
                primaryImageId,
                variants: variantPayloads,
                keptVariantIds,
            });

            // Upload new images sequentially (best-effort)
            for (const img of newImages) {
                await uploadNewImage(resolvedProductId, img);
            }

            showToast('success', t('editor.feedback.updateSuccess', { name: data.name }));
            queryClient.invalidateQueries({ queryKey: productKeys.all });
            setFormDirty(false);
            setTimeout(() => navigate('/admin/products'), 1800);
        } catch (err: unknown) {
            const error = err as { message?: string };
            showToast('error', error.message || t('editor.feedback.createError'));
        } finally {
            setSaving(false);
        }
    };

    // ─── Style helpers ────────────────────────────────────────────────────
    const inputCls = (hasErr?: boolean) =>
        `w-full bg-black/20 border rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-colors ${hasErr
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/10 focus:border-primary focus:ring-primary'
        }`;
    const labelCls = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5';
    // ─── Loading / Error States ───────────────────────────────────────────
    if (loadingProduct) return <EditSkeleton />;

    if (loadError) return (
        <div className="flex flex-col h-full items-center justify-center gap-4" style={VN_FONT}>
            <AlertCircle size={48} className="text-red-500" />
            <p className="text-white/70">{loadError}</p>
            <button
                onClick={() => navigate('/admin/products')}
                className="mt-2 text-primary text-sm font-bold underline underline-offset-2"
            >
                {t('editor.actions.backToList')}
            </button>
        </div>
    );

    const activeExisting = existingImages.filter(i => !i.markedForDelete);
    const hasPrimary = activeExisting.some(i => i.isPrimary) || newImages.some(i => i.isPrimary);

    return (
        <AdminPageShell className="h-full bg-bg-dark">

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in-up
              ${t.type === 'success'
                                ? 'bg-surface-dark border-emerald-500/30 text-white'
                                : 'bg-surface-dark border-red-500/30 text-white'}`}>
                        {t.type === 'success'
                            ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            : <AlertCircle size={16} className="text-red-400 shrink-0" />}
                        {t.text}
                    </div>
                ))}
            </div>

            {showLeaveDialog && (
                <AdminModalShell
                    icon={AlertCircle}
                    iconWrapperClassName="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-400"
                    iconClassName="text-amber-400"
                    title={t('editor.modal.unsavedTitle')}
                    subtitle={t('editor.modal.unsavedSubtitle')}
                    onClose={() => {
                        setShowLeaveDialog(false);
                        setPendingNavigation(null);
                    }}
                    maxWidthClassName="max-w-md"
                    panelClassName="bg-surface-dark"
                    bodyClassName="px-6 py-5"
                    footer={(
                        <div className="flex items-center justify-end gap-3">
                            <AdminSecondaryButton
                                type="button"
                                onClick={() => {
                                    setShowLeaveDialog(false);
                                    setPendingNavigation(null);
                                }}
                                className="px-4 py-2.5"
                            >
                                {t('editor.actions.stayHere')}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                type="button"
                                onClick={() => {
                                    setShowLeaveDialog(false);
                                    const proceed = pendingNavigation;
                                    setPendingNavigation(null);
                                    proceed?.();
                                }}
                                className="px-4 py-2.5"
                            >
                                {t('editor.actions.leavePage')}
                            </AdminPrimaryButton>
                        </div>
                    )}
                >
                    <p className="text-sm text-white/65 leading-relaxed">
                        {t('editor.feedback.unsavedChanges')}
                    </p>
                </AdminModalShell>
            )}

            <AdminPageHeader
                icon={Tag}
                eyebrow={t('editor.breadcrumbs.products')}
                title={productName}
                subtitle={t('editor.breadcrumbs.update')}
                actions={(
                    <>
                        <AdminIconButton
                            type="button"
                            onClick={() => attemptNavigation(() => navigate('/admin/products'))}
                            aria-label={t('editor.actions.backToList')}
                        >
                            <ArrowLeft size={18} />
                        </AdminIconButton>
                        <AdminPrimaryButton type="button" onClick={handleSubmit(onSubmit)} disabled={saving}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? t('editor.actions.saving') : t('editor.actions.saveChanges')}
                        </AdminPrimaryButton>
                    </>
                )}
            />

            {/* Body */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                onChange={() => setFormDirty(true)}
                className="flex-1 overflow-y-auto"
            >
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">

                    {/* ─── Left column ─────────────────────────────────────── */}
                    <div className="space-y-6">

                        {/* Section 1: Thông tin cơ bản */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <div className="flex items-center gap-2 mb-1">
                                <Tag size={15} className="text-primary" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('editor.sections.basicInfo')}</h2>
                            </div>

                            <div>
                                <label className={labelCls}>{t('editor.fields.name')} *</label>
                                <input
                                    {...register('name')}
                                    placeholder={t('editor.fields.VariantNameEdit')}
                                    className={inputCls(!!errors.name)}
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                                {slugPreview && (
                                    <p className="mt-1.5 text-[11px] text-white/30">
                                        {t('editor.fields.slug')} <span className="text-white/50 font-mono">{slugPreview}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>{t('editor.fields.description')}</label>
                                <textarea
                                    {...register('description')}
                                    rows={4}
                                    placeholder={t('editor.fields.descPlaceholderEdit')}
                                    className={inputCls() + ' resize-none'}
                                />
                            </div>
                        </AdminSectionCard>

                        {/* Section 2: Phân loại hàng — VariantManager */}
                        <AdminSectionCard bodyClassName="p-6">
                            {vmInitialGroups !== undefined ? (
                                <VariantManager
                                    baseSku={watch('baseSku') ?? ''}
                                    basePrice={watch('basePrice') ?? ''}
                                    initialGroups={vmInitialGroups}
                                    initialVariants={vmInitialVariants}
                                    onChange={handleVariantChange}
                                />
                            ) : (
                                <div className="flex items-center gap-2 py-4 text-white/30 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('editor.feedback.loadingVariants')}
                                </div>
                            )}
                        </AdminSectionCard>

                        {/* Section 3: Hình ảnh — ProductImageManager */}
                        <AdminSectionCard bodyClassName="p-6">
                            {imInitialized && (
                                <ProductImageManager
                                    productId={resolvedProductId}
                                    variants={variants}
                                    initialImages={managedImages}
                                    onChange={handleImagesChange}
                                />
                            )}
                            {!imInitialized && (
                                <div className="flex items-center gap-2 py-6 text-white/30 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('editor.feedback.loadingImages')}
                                </div>
                            )}
                        </AdminSectionCard>

                    </div>{/* end left column */}

                    {/* ─── Right sidebar ───────────────────────────────────── */}
                    <div className="space-y-4">


                        {/* Status */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{t('editor.sections.status')}</h3>
                            <select {...register('status')} className={inputCls()}>
                                <option value="Active">{t('editor.fields.statusActiveEdit')}</option>
                                <option value="Draft">{t('editor.fields.statusDraftEdit')}</option>
                                <option value="Archived">{t('editor.fields.statusArchivedEdit')}</option>
                            </select>
                        </AdminSectionCard>

                        {/* Category & Brand */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{t('editor.sections.categoryAndBrand')}</h3>
                            <div>
                                <label className={labelCls}>{t('editor.fields.category')} *</label>
                                <select {...register('categoryId')} className={inputCls(!!errors.categoryId)}>
                                    <option value="">{t('editor.fields.categorySelect')}</option>
                                    {categories.map(c => (
                                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                                    ))}
                                </select>
                                {errors.categoryId && <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>{t('editor.fields.brand')}</label>
                                <select {...register('brandId')} className={inputCls()}>
                                    <option value="">{t('editor.fields.brandSelect')}</option>
                                    {brands.map(b => (
                                        <option key={b.brandId} value={b.brandId}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </AdminSectionCard>

                        {/* Pricing */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{t('editor.sections.priceAndSku')}</h3>
                            <div>
                                <label className={labelCls}>{t('editor.fields.basePrice')} *</label>
                                <input type="number" {...register('basePrice')}
                                    placeholder={t('editor.fields.basePricePlaceholder')}
                                    className={inputCls(!!errors.basePrice)} />
                                {errors.basePrice && <p className="mt-1 text-xs text-red-400">{errors.basePrice.message}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>{t('editor.fields.baseSku')}</label>
                                <input {...register('baseSku')}
                                    placeholder={t('editor.fields.baseSkuPlaceholderEdit')}
                                    className={inputCls()}
                                />
                                <p className="mt-1 text-[10px] text-white/30">{t('editor.fields.baseSkuHintEdit')}</p>
                            </div>
                        </AdminSectionCard>

                        {/* Summary card */}
                        < div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2" >
                            <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">{t('editor.sections.summary')}</p>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/50">{t('editor.fields.summaryExistingVariants')}</span>
                                <span className="text-white">{variants.filter(v => v.variantId).length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/50">{t('editor.fields.summaryNewVariants')}</span>
                                <span className="text-emerald-400">{variants.filter(v => !v.variantId).length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/50">{t('editor.fields.summaryImagesToDelete')}</span>
                                <span className="text-red-400">{existingImages.filter(i => i.markedForDelete).length}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/50">{t('editor.fields.summaryImagesToAdd')}</span>
                                <span className="text-emerald-400">{newImages.length}</span>
                            </div>
                        </div >
                    </div >
                </div >
            </form >
        </AdminPageShell>
    );
};



