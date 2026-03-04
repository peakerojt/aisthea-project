import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Edit2, Trash2, ChevronRight, ChevronDown,
    CornerDownRight, AlertCircle, CheckCircle2, ImageIcon, Loader2,
    Tag,
} from 'lucide-react';
import { ViewState } from '../types';
import {
    CategoryNode,
    CategoryFlat,
    fetchCategoryTree,
    fetchCategoryFlat,
    createCategory,
    updateCategory,
    deleteCategory,
    CreateCategoryPayload,
} from '../services/category.service';
import { CategoryFormModal } from '../components/features/CategoryFormModal';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminCategoriesProps {
    setView: (v: ViewState) => void;
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface DeleteModalState {
    open: boolean;
    id: number;
    name: string;
}

// ─── Tree Row (Recursive) ─────────────────────────────────────────────────────

interface TreeRowProps {
    node: CategoryNode;
    level: number;
    expandedIds: Set<number>;
    onToggle: (id: number) => void;
    onEdit: (node: CategoryNode) => void;
    onDelete: (id: number, name: string) => void;
    t: (key: string) => string;
}

const TreeRow: React.FC<TreeRowProps> = ({
    node,
    level,
    expandedIds,
    onToggle,
    onEdit,
    onDelete,
    t,
}) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.categoryId);
    const isRoot = level === 0;

    return (
        <>
            <tr
                className={`group transition-colors border-b border-white/[0.04] ${isRoot
                    ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                    : 'hover:bg-white/[0.02]'
                    }`}
            >
                {/* Expand toggle + indent */}
                <td className="pl-4 pr-0 py-3 w-10">
                    {hasChildren ? (
                        <button
                            onClick={() => onToggle(node.categoryId)}
                            className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            {isExpanded
                                ? <ChevronDown size={14} />
                                : <ChevronRight size={14} />}
                        </button>
                    ) : (
                        <div className="w-6" />
                    )}
                </td>

                {/* Image */}
                <td className="py-3 pr-3 w-14">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        {node.imageUrl ? (
                            <img
                                src={node.imageUrl}
                                alt={node.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <ImageIcon size={16} className="text-white/20" />
                        )}
                    </div>
                </td>

                {/* Tên danh mục */}
                <td className="py-3 pr-4">
                    <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: level > 0 ? `${level * 16}px` : '0' }}
                    >
                        {level > 0 && (
                            <CornerDownRight size={14} className="text-white/20 flex-shrink-0" />
                        )}
                        <div>
                            <p
                                className={`text-sm leading-tight ${isRoot
                                    ? 'font-bold text-white'
                                    : 'font-medium text-white/80'
                                    }`}
                            >
                                {node.name}
                            </p>
                            {node.description && (
                                <p className="text-[11px] text-white/30 mt-0.5 truncate max-w-[220px]">
                                    {node.description}
                                </p>
                            )}
                        </div>
                    </div>
                </td>

                {/* Đường dẫn tĩnh */}
                <td className="py-3 pr-4">
                    <code className="text-[11px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                        {node.slug}
                    </code>
                </td>

                {/* Số sản phẩm */}
                <td className="py-3 pr-4 text-center">
                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${node._count.products > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-white/30 border border-white/10'
                            }`}
                    >
                        {node._count.products}
                    </span>
                </td>

                {/* Thao tác */}
                <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(node)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-white/10 transition-colors"
                            title={t('actions.edit')}
                        >
                            <Edit2 size={15} />
                        </button>
                        <button
                            onClick={() => onDelete(node.categoryId, node.name)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                            title={t('actions.delete')}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </td>
            </tr>

            {/* Render children recursively */}
            {hasChildren && isExpanded && node.children.map(child => (
                <TreeRow
                    key={child.categoryId}
                    node={child}
                    level={level + 1}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    t={t}
                />
            ))}
        </>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminCategories: React.FC<AdminCategoriesProps> = ({ setView: _setView }) => {
    const { t } = useTranslation('categories');
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [flat, setFlat] = useState<CategoryFlat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Collapse state — all roots expanded by default
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // Modal state
    const [formModal, setFormModal] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        editing: CategoryNode | null;
    }>({ open: false, mode: 'create', editing: null });

    // Delete confirmation
    const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Toast
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(null), 4000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [treeData, flatData] = await Promise.all([
                fetchCategoryTree(),
                fetchCategoryFlat(),
            ]);
            setTree(treeData);
            setFlat(flatData);
            // Auto-expand all roots
            setExpandedIds(new Set(treeData.map(n => n.categoryId)));
        } catch (e: any) {
            setError(e.message || t('feedback.loadErrorDetail'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggle = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleOpenCreate = () =>
        setFormModal({ open: true, mode: 'create', editing: null });

    const handleOpenEdit = (node: CategoryNode) =>
        setFormModal({ open: true, mode: 'edit', editing: node });

    const handleCloseForm = () =>
        setFormModal({ open: false, mode: 'create', editing: null });

    const handleSubmitForm = async (payload: CreateCategoryPayload) => {
        try {
            if (formModal.mode === 'create') {
                await createCategory(payload);
                showToast(t('feedback.createSuccess'), 'success');
            } else if (formModal.editing) {
                await updateCategory(formModal.editing.categoryId, payload);
                showToast(t('feedback.updateSuccess'), 'success');
            }
            handleCloseForm();
            await loadData();
        } catch (e: any) {
            showToast(e.message || t('feedback.genericError'), 'error');
            throw e; // Let modal handle spinner reset
        }
    };

    const handleDeleteRequest = (id: number, name: string) => {
        setDeleteModal({ open: true, id, name });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal) return;
        setDeleting(true);
        try {
            await deleteCategory(deleteModal.id);
            setDeleteModal(null);
            showToast(t('feedback.deleteSuccess'), 'success');
            await loadData();
        } catch (e: any) {
            setDeleteModal(null);
            showToast(e.message || t('feedback.deleteError'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    const totalCategories = flat.length;
    const rootCount = tree.length;

    return (
        <div className="p-8 max-w-[1400px] mx-auto h-full flex flex-col relative" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>

            {/* ── CategoryFormModal ──────────────────────────────────────────── */}
            {formModal.open && (
                <CategoryFormModal
                    mode={formModal.mode}
                    editingCategory={formModal.editing}
                    flatList={flat}
                    onClose={handleCloseForm}
                    onSubmit={handleSubmitForm}
                />
            )}

            {/* ── Delete Confirmation ────────────────────────────────────────── */}
            {deleteModal?.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteModal(null)}
                    />
                    <div className="relative bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 size={18} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">{t('delete.title')}</h3>
                                <p className="text-[11px] text-white/40 mt-0.5 font-mono truncate max-w-[280px]">
                                    {deleteModal.name}
                                </p>
                            </div>
                        </div>
                        <p
                            className="text-sm text-white/60 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: t('delete.warning') }}
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteModal(null)}
                                disabled={deleting}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
                            >
                                {t('delete.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-red-900/30"
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleting ? t('delete.deleting') : t('delete.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─────────────────────────────────────────────────────── */}
            {toast?.visible && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up pointer-events-none">
                    <div className={`bg-[#111113] border shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 ${toast.type === 'error' ? 'border-red-500/30' : 'border-emerald-500/20'
                        }`}>
                        {toast.type === 'error'
                            ? <AlertCircle size={14} className="text-red-400 shrink-0" />
                            : <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                        <span className="text-sm font-medium text-white">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className="h-20 flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Tag size={16} className="text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{t('page.title')}</h2>
                    </div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 pl-11">
                        {t('page.summary', { total: totalCategories, roots: rootCount })}
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.1em] px-6 py-3 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                    <Plus size={16} />
                    {t('actions.addCategory')}
                </button>
            </header>

            {/* ── Loading ──────────────────────────────────────────────────── */}
            {loading && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-white/40">{t('feedback.loading')}</p>
                    </div>
                </div>
            )}

            {/* ── Error ────────────────────────────────────────────────────── */}
            {error && !loading && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                        <AlertCircle size={40} className="text-red-400" />
                        <div>
                            <h3 className="text-base font-bold text-white mb-1">{t('feedback.loadError')}</h3>
                            <p className="text-sm text-white/50">{error}</p>
                        </div>
                        <button
                            onClick={loadData}
                            className="text-xs text-primary font-bold uppercase tracking-wider hover:underline"
                        >
                            {t('actions.retry')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tree Table ───────────────────────────────────────────────── */}
            {!loading && !error && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1 overflow-hidden">
                    {tree.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                                <Tag size={24} className="text-white/20" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-white/60">{t('empty.noCategories')}</p>
                                <p className="text-sm text-white/30 mt-1">{t('empty.startHint')}</p>
                            </div>
                            <button
                                onClick={handleOpenCreate}
                                className="mt-2 text-xs font-bold text-primary uppercase tracking-wider hover:underline flex items-center gap-1"
                            >
                                <Plus size={13} /> {t('actions.createFirst')}
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/[0.02] border-b border-white/8">
                                    <tr className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                        <th className="pl-4 py-4 w-10" />
                                        <th className="py-4 pr-3 w-14">{t('table.image')}</th>
                                        <th className="py-4 pr-4">{t('table.name')}</th>
                                        <th className="py-4 pr-4">{t('table.slug')}</th>
                                        <th className="py-4 pr-4 text-center w-28">{t('table.products')}</th>
                                        <th className="py-4 pr-4 text-right w-24">{t('table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tree.map(node => (
                                        <TreeRow
                                            key={node.categoryId}
                                            node={node}
                                            level={0}
                                            expandedIds={expandedIds}
                                            onToggle={handleToggle}
                                            onEdit={handleOpenEdit}
                                            onDelete={handleDeleteRequest}
                                            t={t as (key: string) => string}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
