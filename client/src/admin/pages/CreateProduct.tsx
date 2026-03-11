import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ViewState } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/common/hooks/useProducts';
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

// ─── Local Types ──────────────────────────────────────────────────────────────
interface AttributeGroup {
    id: number;
    name: string;
    values: string[];
}

interface VariantRow {
    id: string;
    label: string;
    combination: { attr: string; value: string }[];
    sku: string;
    price: string;
    stock: string;
}

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

function cartesian(groups: AttributeGroup[]): { attr: string; value: string }[][] {
    const valid = groups.filter(g => g.name.trim() && g.values.length > 0);
    if (!valid.length) return [];
    return valid.reduce<{ attr: string; value: string }[][]>(
        (acc, g) => acc.flatMap(combo => g.values.map(v => [...combo, { attr: g.name, value: v }])),
        [[]]
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
    setView: (v: ViewState) => void;
}

export const CreateProduct: React.FC<Props> = ({ setView }) => {
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

    // Attributes & Variants
    const [groups, setGroups] = useState<AttributeGroup[]>([
        { id: Date.now(), name: '', values: [] },
    ]);
    const [variants, setVariants] = useState<VariantRow[]>([]);

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

    // ─── Regenerate variant matrix when groups change ─────────────────────────
    useEffect(() => {
        const combos = cartesian(groups);
        const baseSku = getValues('baseSku') || 'SKU';
        const basePrice = getValues('basePrice') || '';
        setVariants(prev =>
            combos.map(combo => {
                const label = combo.map(c => c.value).join(' / ');
                const existing = prev.find(v => v.label === label);
                if (existing) return existing;
                const suffix = combo.map(c => c.value.slice(0, 3).toUpperCase()).join('-');
                return {
                    id: Math.random().toString(36).slice(2),
                    label, combination: combo,
                    sku: `${baseSku}-${suffix}`,
                    price: basePrice,
                    stock: '0',
                };
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups]);

    // ─── Toast ────────────────────────────────────────────────────────────────
    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    // ─── Attribute group helpers ──────────────────────────────────────────────
    const addGroup = () =>
        setGroups(g => [...g, { id: Date.now(), name: '', values: [] }]);

    const removeGroup = (id: number) =>
        setGroups(g => g.filter(x => x.id !== id));

    const updateGroupName = (id: number, name: string) =>
        setGroups(g => g.map(x => x.id === id ? { ...x, name } : x));

    const addValue = (id: number, val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        setGroups(g =>
            g.map(x =>
                x.id === id && !x.values.includes(trimmed)
                    ? { ...x, values: [...x.values, trimmed] }
                    : x
            )
        );
    };

    const removeValue = (id: number, val: string) =>
        setGroups(g => g.map(x => x.id === id
            ? { ...x, values: x.values.filter(v => v !== val) }
            : x
        ));

    // ─── Variant helpers ──────────────────────────────────────────────────────
    const updateVariant = (id: string, field: 'sku' | 'price' | 'stock', value: string) =>
        setVariants(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));

    const syncPriceAll = () => {
        const p = getValues('basePrice');
        if (!p) return;
        setVariants(v => v.map(x => ({ ...x, price: p })));
        showToast('success', t('editor.feedback.syncPriceSuccess', { price: Number(p).toLocaleString('vi-VN') }));
    };

    const regenSkus = () => {
        const base = getValues('baseSku') || 'SKU';
        setVariants(v =>
            v.map(x => ({
                ...x,
                sku: `${base}-${x.combination.map(c => c.value.slice(0, 3).toUpperCase()).join('-')}`,
            }))
        );
    };


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
            setTimeout(() => setView('ADMIN_PRODUCTS'), 1800);
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
    const cardCls = 'bg-surface-dark rounded-xl p-6 border border-white/5 space-y-5';
    const PRESET_ATTRS = ['Màu sắc', 'Kích thước', 'Chất liệu', 'Kiểu dáng'];

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-bg-dark" style={VN_FONT}>

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

            {/* Sticky Header */}
            <header className="sticky top-0 z-10 h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface-dark/80 backdrop-blur-lg shrink-0">
                <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                        <button onClick={() => setView('ADMIN_DASHBOARD')} className="hover:text-white transition-colors">{t('editor.breadcrumbs.home')}</button>
                        <ChevronRight size={10} />
                        <button onClick={() => setView('ADMIN_PRODUCTS')} className="hover:text-white transition-colors">{t('editor.breadcrumbs.products')}</button>
                        <ChevronRight size={10} />
                        <span className="text-gray-300">{t('editor.breadcrumbs.create')}</span>
                    </div>
                    <h1 className="text-base font-bold text-white leading-none">{t('page.create')}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setView('ADMIN_PRODUCTS')}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
                        <ArrowLeft size={15} />
                        {t('editor.actions.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit(onSubmit)}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                        {saving ? t('editor.actions.saving') : t('editor.actions.publish')}
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── LEFT COLUMN ── */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Section 1: Thông tin cơ bản */}
                        <section className={cardCls}>
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
                        </section>

                        {/* Section 2: Phân loại hàng */}
                        <section className={cardCls}>
                            <div className="flex items-center gap-2">
                                <Layers size={15} className="text-primary" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('editor.sections.variants')}</h2>
                            </div>
                            <p className="text-xs text-gray-500 -mt-3">
                                Thêm thuộc tính như Màu sắc, Kích thước. Hệ thống tự tạo bảng phân loại.
                            </p>

                            {/* Attribute Groups */}
                            <div className="space-y-4">
                                {groups.map(g => (
                                    <div key={g.id} className="p-4 bg-black/20 rounded-lg border border-white/5">
                                        <div className="flex gap-3 items-start">
                                            {/* Name */}
                                            <div className="w-44 shrink-0">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{t('editor.fields.attrName')}</label>
                                                <input
                                                    value={g.name}
                                                    onChange={e => updateGroupName(g.id, e.target.value)}
                                                    placeholder={t('editor.fields.attrNamePlaceholder')}
                                                    className="w-full bg-surface-dark border border-white/10 rounded px-2.5 py-2 text-sm text-white focus:outline-none focus:border-primary"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {PRESET_ATTRS.map(p => (
                                                        <button key={p} type="button"
                                                            onClick={() => updateGroupName(g.id, p)}
                                                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border transition-colors ${g.name === p
                                                                ? 'bg-primary text-white border-primary'
                                                                : 'text-gray-500 border-white/10 hover:text-white hover:border-white/30'
                                                                }`}>
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Values */}
                                            <div className="flex-1">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{t('editor.fields.attrValues')}</label>
                                                <div className="min-h-[40px] bg-surface-dark border border-white/10 rounded px-2.5 py-1.5 flex flex-wrap gap-1.5 items-center focus-within:border-primary transition-colors">
                                                    {g.values.map(val => (
                                                        <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded text-xs text-white border border-white/10">
                                                            {val}
                                                            <button type="button" onClick={() => removeValue(g.id, val)} className="hover:text-red-400 ml-0.5">
                                                                <X size={10} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                    <input
                                                        placeholder={g.values.length === 0 ? `VD: ${g.name === 'Màu sắc' ? 'Đỏ, Xanh' : 'S, M, L'}` : ''}
                                                        className="bg-transparent border-none p-0 text-sm text-white focus:outline-none min-w-[100px] flex-1"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addValue(g.id, e.currentTarget.value);
                                                                e.currentTarget.value = '';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Remove */}
                                            {groups.length > 1 && (
                                                <button type="button" onClick={() => removeGroup(g.id)}
                                                    className="mt-6 p-1.5 text-gray-600 hover:text-red-400 transition-colors shrink-0">
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={addGroup}
                                    className="flex items-center gap-2 text-xs font-bold text-primary hover:text-white uppercase tracking-wider transition-colors">
                                    <Plus size={14} /> {t('editor.fields.createAttr')}
                                </button>
                            </div>

                            {/* Variant Matrix */}
                            {variants.length > 0 && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            {t('editor.fields.variantTable', { count: variants.length })}
                                        </h3>
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                                            <button type="button" onClick={syncPriceAll}
                                                className="text-primary hover:text-white transition-colors flex items-center gap-1">
                                                <RefreshCw size={10} /> {t('editor.fields.syncPrice')}
                                            </button>
                                            <span className="text-white/10">|</span>
                                            <button type="button" onClick={regenSkus}
                                                className="text-primary hover:text-white transition-colors flex items-center gap-1">
                                                <RefreshCw size={10} /> {t('editor.fields.regenSku')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-white/10 rounded-lg">
                                        <table className="w-full text-left text-sm min-w-[560px]">
                                            <thead className="bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-white/10">{t('editor.fields.variantName')}</th>
                                                    <th className="px-4 py-3 border-b border-white/10 w-36">{t('editor.fields.sku')}</th>
                                                    <th className="px-4 py-3 border-b border-white/10 w-32">{t('editor.fields.price')}</th>
                                                    <th className="px-4 py-3 border-b border-white/10 w-28">{t('editor.fields.stock')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {variants.map((v, i) => (
                                                    <tr key={v.id} className="hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-4 py-2.5">
                                                            <span className="text-white font-semibold text-sm">{v.label}</span>
                                                            {i === 0 && (
                                                                <span className="ml-2 text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                                                    {t('editor.fields.default')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                value={v.sku}
                                                                onChange={e => updateVariant(v.id, 'sku', e.target.value)}
                                                                className="w-full bg-transparent border-b border-white/10 text-xs text-gray-400 font-mono py-0.5 focus:outline-none focus:border-primary transition-colors"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="number"
                                                                value={v.price}
                                                                onChange={e => updateVariant(v.id, 'price', e.target.value)}
                                                                placeholder="0"
                                                                className={`w-full bg-black/20 border rounded px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-primary transition-colors ${!v.price ? 'border-red-500/50' : 'border-white/10'
                                                                    }`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={v.stock}
                                                                onChange={e => updateVariant(v.id, 'stock', e.target.value)}
                                                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-primary transition-colors"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Section 3: Hình ảnh — ProductImageManager */}
                        <section className={cardCls}>
                            <ProductImageManager
                                variants={variants}
                                attributeGroups={groups}
                                initialImages={managedImages}
                                onChange={handleImagesChange}
                            />
                        </section>

                    </div>{/* /LEFT */}

                    {/* ── RIGHT COLUMN ── */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Trạng thái */}
                        <div className={cardCls}>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('editor.sections.status')}</h3>
                            <div>
                                <label className={labelCls}>{t('editor.fields.visibility')}</label>
                                <select {...register('status')} className={inputCls(false)}>
                                    <option value="Active">{t('editor.fields.statusActive')}</option>
                                    <option value="Draft">{t('editor.fields.statusDraft')}</option>
                                    <option value="Archived">{t('editor.fields.statusArchived')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Tổ chức */}
                        <div className={cardCls}>
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
                        </div>

                        {/* Giá & SKU */}
                        <div className={cardCls}>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('editor.sections.priceAndStock')}</h3>

                            <div>
                                <label className={labelCls}>
                                    {t('editor.fields.basePrice')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₫</span>
                                    <input
                                        type="number"
                                        {...register('basePrice', {
                                            onChange: e => {
                                                if (variants.length > 0) {
                                                    setVariants(v => v.map(x => x.price ? x : { ...x, price: e.target.value }));
                                                }
                                            },
                                        })}
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
                                    {...register('baseSku', { onChange: () => regenSkus() })}
                                    placeholder={t('editor.fields.baseSkuPlaceholder')}
                                    className={inputCls(false) + ' font-mono text-xs'}
                                />
                                <p className="text-[10px] text-gray-600 mt-1">{t('editor.fields.baseSkuHint')}</p>
                            </div>
                        </div>

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
        </div>
    );
};

export default CreateProduct;
