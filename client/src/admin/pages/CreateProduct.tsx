import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    createProduct,
    fetchCategories,
    fetchBrands,
    CreateVariantPayload,
} from '@/common/services/product.service';
import type { CategoryOption, BrandOption } from '@/common/services/product.service';
import { API_BASE_URL } from '@/common/utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/common/hooks/useProducts';
import {
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
    AdminSectionCard,
} from '@/admin/components/AdminUI';
import VariantManager from '@/admin/components/VariantManager';
import type { VariantRow as VMRow } from '@/admin/components/VariantManager';
import ProductImageManager from '@/admin/components/ProductImageManager';
import type { ProductImageState } from '@/admin/components/ProductImageManager';
import {
    Upload, X, Star, StarOff, CheckCircle2, AlertCircle,
    ChevronRight, Plus, Trash2, RefreshCw, Tag, Package,
    Image as ImageIcon, Layers, ArrowLeft, Loader2,
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

interface LocalImage {
    id: string;
    file?: File;
    previewUrl: string;
    isPrimary: boolean;
    uploading: boolean;
}

interface ToastMsg {
    id: string;
    type: 'success' | 'error';
    text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSlug = (s: string) =>
    s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

// ─── Component ────────────────────────────────────────────────────────────────
export const CreateProduct: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['products']);
    const queryClient = useQueryClient();
    const {
        register,
        handleSubmit,
        watch,
        getValues,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { status: 'Active' },
    });

    // Meta
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [brands, setBrands] = useState<BrandOption[]>([]);

    // Slug
    const productName = watch('name', '');
    const slugPreview = toSlug(productName);

    // Variants
    const [variants, setVariants] = useState<VMRow[]>([]);

    const handleVariantChange = useCallback((rows: VMRow[]) => {
        setVariants(rows);
    }, []);

    // Images — managed by ProductImageManager
    const [managedImages, setManagedImages] = useState<ProductImageState[]>([]);

    const handleImagesChange = useCallback((imgs: ProductImageState[]) => {
        setManagedImages(imgs);
    }, []);

    // UI State
    const [saving, setSaving] = useState(false);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);

    // ─── Load meta ────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchCategories().then(setCategories).catch(console.error);
        fetchBrands().then(setBrands).catch(console.error);
    }, []);

    // ─── Toast ────────────────────────────────────────────────────────────────
    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    // Upload single image to backend after product creation (with associatedAttributeValue support)
    const uploadImage = async (productId: number, img: ProductImageState): Promise<void> => {
        if (!img.file) return;
        const fd = new FormData();
        fd.append('file', img.file);
        fd.append('isPrimary', img.isPrimary ? 'true' : 'false');
        if (img.associatedAttributeValue) {
            fd.append('associatedAttributeValue', img.associatedAttributeValue);
        }
        try {
            await fetch(`${API_BASE_URL}/api/products/${productId}/image`, {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
        } catch {
            // Best-effort; product was still created
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
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
            const variantPayloads: CreateVariantPayload[] = variants.map((v, i) => ({
                sku: v.sku,
                price: Number(v.price),
                stockQuantity: Number(v.stock) || 0,
                isDefault: i === 0,
                attributeValues: v.combination.map(c => ({ attributeName: c.attr, value: c.value })),
            }));

            const result = await createProduct({
                name: data.name,
                slug: slugPreview || toSlug(data.name),
                description: data.description,
                basePrice: Number(data.basePrice),
                categoryId: Number(data.categoryId),
                brandId: data.brandId ? Number(data.brandId) : undefined,
                status: data.status || 'Active',
                variants: variantPayloads,
                images: [],
            });

            const productId = result.productId;

            // Upload images sequentially — pass associatedAttributeValue for Zone B images
            const imagesToUpload = managedImages.filter(i => i.file);
            for (const img of imagesToUpload) {
                await uploadImage(productId, img);
            }

            showToast('success', t('editor.feedback.createSuccess', { name: data.name, count: variants.length }));
            queryClient.invalidateQueries({ queryKey: productKeys.all });
            setTimeout(() => navigate('/admin/products'), 1800);
        } catch (error) {
            const err = error as Error | { message?: string; error?: string; data?: unknown };
            showToast('error', err.message || t('editor.feedback.createError'));
        } finally {
            setSaving(false);
        }
    };

    // ─── Style helpers ────────────────────────────────────────────────────────
    const inputCls = (hasErr?: boolean) =>
        `w-full bg-black/20 border rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-colors ${hasErr
            ? 'border-red-500 focus:ring-red-500'
            : 'border-white/10 focus:border-primary focus:ring-primary'
        }`;
    const labelCls = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5';
    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <AdminPageShell className="h-full bg-bg-dark" >

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
              ${t.type === 'success'
                                ? 'bg-surface-dark border-emerald-500/30 text-white'
                                : 'bg-surface-dark border-red-500/30 text-white'}`}>
                        {t.type === 'success'
                            ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            : <AlertCircle size={16} className="text-red-400 shrink-0" />}
                        <span>{t.text}</span>
                    </div>
                ))}
            </div>

            <AdminPageHeader
                icon={Package}
                eyebrow={t('editor.breadcrumbs.products')}
                title={t('page.create')}
                subtitle={t('editor.breadcrumbs.create')}
                actions={(
                    <>
                        <AdminSecondaryButton type="button" onClick={() => navigate('/admin/products')}>
                            <ArrowLeft size={15} />
                            {t('editor.actions.cancel')}
                        </AdminSecondaryButton>
                        <AdminPrimaryButton type="button" onClick={handleSubmit(onSubmit)} disabled={saving}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                            {saving ? t('editor.actions.saving') : t('editor.actions.publish')}
                        </AdminPrimaryButton>
                    </>
                )}
            />

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                    {/* ── LEFT COLUMN ── */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Section 1: Thông tin cơ bản */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <div className="flex items-center gap-2">
                                <Tag size={15} className="text-primary" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('editor.sections.basicInfo')}</h2>
                            </div>

                            {/* Name */}
                            <div>
                                <label className={labelCls}>
                                    {t('editor.fields.name')} <span className="text-red-400">*</span>
                                </label>
                                <input
                                    {...register('name')}
                                    placeholder={t('editor.fields.namePlaceholder')}
                                    className={`w-full bg-transparent border-0 border-b-2 text-2xl font-bold text-white placeholder:text-white/15 py-2 focus:outline-none transition-colors ${errors.name ? 'border-red-500' : 'border-white/15 focus:border-primary'
                                        }`}
                                />
                                {errors.name && (
                                    <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                                )}
                                {productName && (
                                    <p className="text-[11px] text-gray-500 mt-2 font-mono flex items-center gap-1.5">
                                        <span className="text-gray-600">{t('editor.fields.slug')}</span>
                                        <span className="text-primary/80">{slugPreview}</span>
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelCls}>{t('editor.fields.description')}</label>
                                <textarea
                                    {...register('description')}
                                    rows={5}
                                    placeholder={t('editor.fields.descriptionPlaceholder')}
                                    className={inputCls(false) + ' resize-none'}
                                />
                            </div>
                        </AdminSectionCard>

                        {/* Section 2: Phân loại hàng */}
                        <AdminSectionCard bodyClassName="p-6">
                            <VariantManager
                                baseSku={watch('baseSku') ?? ''}
                                basePrice={watch('basePrice') ?? ''}
                                onChange={handleVariantChange}
                            />
                        </AdminSectionCard>

                        {/* Section 3: Hình ảnh — ProductImageManager */}
                        <AdminSectionCard bodyClassName="p-6">
                            <ProductImageManager
                                variants={variants}
                                initialImages={managedImages}
                                onChange={handleImagesChange}
                            />
                        </AdminSectionCard>

                    </div>{/* /LEFT */}

                    {/* ── RIGHT COLUMN ── */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Trạng thái */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('editor.sections.status')}</h3>
                            <div>
                                <label className={labelCls}>{t('editor.fields.visibility')}</label>
                                <select {...register('status')} className={inputCls(false)}>
                                    <option value="Active">{t('editor.fields.statusActive')}</option>
                                    <option value="Draft">{t('editor.fields.statusDraft')}</option>
                                    <option value="Archived">{t('editor.fields.statusArchived')}</option>
                                </select>
                            </div>
                        </AdminSectionCard>

                        {/* Tổ chức */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('editor.sections.organization')}</h3>

                            <div>
                                <label className={labelCls}>
                                    {t('editor.fields.category')} <span className="text-red-400">*</span>
                                </label>
                                <select {...register('categoryId')} className={inputCls(!!errors.categoryId)}>
                                    <option value="">{t('editor.fields.categorySelect')}</option>
                                    {categories.map(c => (
                                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                                    ))}
                                </select>
                                {errors.categoryId && (
                                    <p className="text-xs text-red-400 mt-1">{errors.categoryId.message}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>{t('editor.fields.brand')}</label>
                                <select {...register('brandId')} className={inputCls(false)}>
                                    <option value="">{t('editor.fields.brandSelect')}</option>
                                    {brands.map(b => (
                                        <option key={b.brandId} value={b.brandId}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </AdminSectionCard>

                        {/* Giá & SKU */}
                        <AdminSectionCard bodyClassName="space-y-5 p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('editor.sections.priceAndStock')}</h3>

                            <div>
                                <label className={labelCls}>
                                    {t('editor.fields.basePrice')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₫</span>
                                    <input
                                        type="number"
                                        {...register('basePrice')}
                                        placeholder={t('editor.fields.basePricePlaceholder')}
                                        className={inputCls(!!errors.basePrice) + ' pl-7'}
                                    />
                                </div>
                                {errors.basePrice && (
                                    <p className="text-xs text-red-400 mt-1">{errors.basePrice.message}</p>
                                )}
                            </div>

                            <div>
                                <label className={labelCls}>{t('editor.fields.baseSku')}</label>
                                <input
                                    {...register('baseSku')}
                                    placeholder={t('editor.fields.baseSkuPlaceholder')}
                                    className={inputCls(false) + ' font-mono text-xs'}
                                />
                                <p className="text-[10px] text-gray-600 mt-1">{t('editor.fields.baseSkuHint')}</p>
                            </div>
                        </AdminSectionCard>

                        {/* Summary */}
                        {variants.length > 0 && (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">{t('editor.sections.summary')}</h3>
                                <div className="text-xs text-gray-300 space-y-1.5">
                                    <div className="flex justify-between">
                                        <span>{t('editor.fields.summaryVariants')}</span>
                                        <span className="font-bold text-white">{variants.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('editor.fields.summaryTotalStock')}</span>
                                        <span className="font-bold text-white">
                                            {variants.reduce((s, v) => s + Number(v.stock || 0), 0).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('editor.fields.summaryImages')}</span>
                                        <span className="font-bold text-white">{managedImages.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>{/* /RIGHT */}
                </div>
            </div>
        </AdminPageShell>
    );
};

export default CreateProduct;
