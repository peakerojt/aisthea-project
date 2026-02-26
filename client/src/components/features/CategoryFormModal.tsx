import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, ImageIcon, Loader2, ChevronDown } from 'lucide-react';
import {
    CategoryFlat,
    CategoryNode,
    CreateCategoryPayload,
    buildIndentedOptions,
    uploadCategoryImage,
} from '../../services/category.service';

// ─── Zod-style validation ─────────────────────────────────────────────────────

interface FormErrors {
    name?: string;
}

function validate(values: { name: string }): FormErrors {
    const errors: FormErrors = {};
    if (!values.name || values.name.trim() === '') {
        errors.name = 'Tên danh mục là bắt buộc.';
    }
    return errors;
}

// ─── Slug generator (mirrors backend) ─────────────────────────────────────────

const VI_MAP: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ả: 'a', ạ: 'a', ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a', è: 'e', é: 'e', ê: 'e', ẽ: 'e', ẻ: 'e', ẹ: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e', ì: 'i', í: 'i', ĩ: 'i', ỉ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ỏ: 'o', ọ: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o', ù: 'u', ú: 'u', û: 'u', ũ: 'u', ủ: 'u', ụ: 'u',
    ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u', ỳ: 'y', ý: 'y', ỹ: 'y', ỷ: 'y', ỵ: 'y', đ: 'd',
    À: 'a', Á: 'a', Â: 'a', Ã: 'a', Ả: 'a', Ạ: 'a', Ă: 'a', Ắ: 'a', Ặ: 'a', Ằ: 'a', Ẳ: 'a', Ẵ: 'a',
    Ấ: 'a', Ầ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a', È: 'e', É: 'e', Ê: 'e', Ẽ: 'e', Ẻ: 'e', Ẹ: 'e',
    Ế: 'e', Ề: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e', Ì: 'i', Í: 'i', Ĩ: 'i', Ỉ: 'i', Ị: 'i',
    Ò: 'o', Ó: 'o', Ô: 'o', Õ: 'o', Ỏ: 'o', Ọ: 'o', Ố: 'o', Ồ: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
    Ơ: 'o', Ớ: 'o', Ờ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o', Ù: 'u', Ú: 'u', Û: 'u', Ũ: 'u', Ủ: 'u', Ụ: 'u',
    Ư: 'u', Ứ: 'u', Ừ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u', Ỳ: 'y', Ý: 'y', Ỹ: 'y', Ỷ: 'y', Ỵ: 'y', Đ: 'd',
};

function toSlug(name: string): string {
    return name.split('').map(c => VI_MAP[c] ?? c).join('')
        .toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryFormModalProps {
    mode: 'create' | 'edit';
    editingCategory?: CategoryNode | null;
    flatList: CategoryFlat[];
    onClose: () => void;
    onSubmit: (payload: CreateCategoryPayload) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
    mode,
    editingCategory,
    flatList,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState(editingCategory?.name ?? '');
    const [parentId, setParentId] = useState<number | null>(
        editingCategory?.parentId ?? null
    );
    const [description, setDescription] = useState(editingCategory?.description ?? '');
    const [imageUrl, setImageUrl] = useState(editingCategory?.imageUrl ?? '');
    const [slugPreview, setSlugPreview] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [parentOpen, setParentOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    // Update slug preview whenever name changes
    useEffect(() => {
        setSlugPreview(toSlug(name));
    }, [name]);

    // Close combobox on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (parentRef.current && !parentRef.current.contains(e.target as Node)) {
                setParentOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const indentedOptions = buildIndentedOptions(flatList);

    // Handle image file upload
    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        try {
            const url = await uploadCategoryImage(file);
            setImageUrl(url);
        } catch (e: any) {
            // silently fail—user can paste URL manually
            console.error('Upload failed', e);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate({ name });
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                parentId: parentId ?? null,
                description: description.trim() || undefined,
                imageUrl: imageUrl.trim() || undefined,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedParentLabel = parentId === null
        ? 'Không có — Là danh mục gốc'
        : flatList.find(c => c.categoryId === parentId)?.name ?? 'Không có — Là danh mục gốc';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className="relative bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
                style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                    <div>
                        <h2 className="text-base font-bold text-white">
                            {mode === 'create' ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}
                        </h2>
                        <p className="text-[11px] text-white/40 mt-0.5">
                            {mode === 'create'
                                ? 'Tạo danh mục sản phẩm mới trong hệ thống'
                                : `Đang chỉnh sửa: ${editingCategory?.name}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 overflow-y-auto max-h-[75vh]">

                    {/* Tên danh mục */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
                            Tên danh mục <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="VD: Áo Thun, Quần Jeans..."
                            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 transition-colors ${errors.name
                                ? 'border-red-500/60 focus:ring-red-500/40'
                                : 'border-white/10 focus:ring-primary/50 focus:border-primary/50'
                                }`}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-400">{errors.name}</p>
                        )}
                        {slugPreview && (
                            <p className="text-[11px] text-white/30">
                                Đường dẫn tĩnh:{' '}
                                <span className="text-white/50 font-mono">{slugPreview}</span>
                            </p>
                        )}
                    </div>

                    {/* Danh mục cha — Custom Combobox */}
                    <div className="flex flex-col gap-1.5" ref={parentRef}>
                        <label className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
                            Danh mục cha
                        </label>
                        <button
                            type="button"
                            onClick={() => setParentOpen(o => !o)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white flex items-center justify-between hover:border-white/20 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            <span className={parentId === null ? 'text-white/40' : 'text-white'}>
                                {selectedParentLabel}
                            </span>
                            <ChevronDown
                                size={16}
                                className={`text-white/40 transition-transform ${parentOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {parentOpen && (
                            <div className="bg-[#1a1a1c] border border-white/10 rounded-xl shadow-2xl overflow-auto max-h-52 mt-1">
                                {/* None option */}
                                <button
                                    type="button"
                                    onClick={() => { setParentId(null); setParentOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${parentId === null ? 'text-primary font-semibold bg-white/[0.03]' : 'text-white/60'
                                        }`}
                                >
                                    Không có — Là danh mục gốc
                                </button>
                                <div className="border-t border-white/5" />
                                {indentedOptions.map(opt => {
                                    // Disable self when editing
                                    const isSelf = mode === 'edit' && editingCategory?.categoryId === opt.value;
                                    const prefix = '— '.repeat(opt.depth);

                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            disabled={isSelf}
                                            onClick={() => { setParentId(opt.value); setParentOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${isSelf
                                                ? 'text-white/20 cursor-not-allowed'
                                                : parentId === opt.value
                                                    ? 'text-primary font-semibold bg-white/[0.03]'
                                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <span className="text-white/30">{prefix}</span>
                                            {opt.label}
                                            {isSelf && (
                                                <span className="ml-2 text-[10px] text-white/20">(danh mục hiện tại)</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Hình ảnh — Drag & Drop */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
                            Hình ảnh
                        </label>

                        {/* Drop zone + preview */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => !imageUrl && fileRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-xl transition-all flex items-center justify-center overflow-hidden h-40 ${imageUrl
                                    ? 'border-white/10 cursor-default'
                                    : isDragOver
                                        ? 'border-primary/60 bg-primary/5 cursor-pointer'
                                        : 'border-white/10 hover:border-white/25 bg-white/[0.02] cursor-pointer'
                                }`}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFile(f);
                                }}
                            />

                            {uploading ? (
                                <div className="flex flex-col items-center gap-2 text-white/50">
                                    <Loader2 size={28} className="animate-spin" />
                                    <span className="text-xs">Đang upload lên Cloudinary...</span>
                                </div>
                            ) : imageUrl ? (
                                <>
                                    {/* Full image preview */}
                                    <img
                                        src={imageUrl}
                                        alt="preview"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    {/* Hover overlay: change image */}
                                    <div
                                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3 cursor-pointer"
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <Upload size={18} className="text-white" />
                                        <span className="text-sm text-white font-semibold">Thay ảnh</span>
                                    </div>
                                    {/* Remove button */}
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setImageUrl(''); }}
                                        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 border border-white/20 flex items-center justify-center text-white transition-colors"
                                        title="Xóa ảnh"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2.5 text-white/30 select-none">
                                    <Upload size={28} />
                                    <div className="text-center">
                                        <p className="text-xs font-medium">Kéo thả hoặc nhấn để chọn ảnh</p>
                                        <p className="text-[10px] mt-0.5 text-white/20">PNG, JPG, WEBP — tối đa 5MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] uppercase tracking-widest text-white/50 font-bold">
                            Mô tả
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Mô tả ngắn về danh mục..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || uploading}
                            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Đang lưu...
                                </>
                            ) : mode === 'create' ? (
                                'Tạo danh mục'
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
