import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/contexts/ToastContext';
import {
    Plus, Edit2, Trash2, ChevronRight, ChevronDown,
    CornerDownRight, AlertCircle, ImageIcon, Loader2,
    Tag,
} from 'lucide-react';
import {
    AdminEmptyState,
    AdminRefreshState,
    AdminModalShell,
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminRowIconButton,
    AdminSectionCard,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';
import {
    CategoryNode,
    CategoryFlat,
    fetchCategoryTree,
    fetchCategoryFlat,
    createCategory,
    updateCategory,
    deleteCategory,
    CreateCategoryPayload,
} from '@/common/services/category.service';
import { CategoryFormModal } from '@/admin/components/CategoryFormModal';
import {
    getDefaultExpandedCategoryIds,
    getRetainedExpandedCategoryIds,
} from '@/admin/utils/categoryTreeState';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminCategoriesProps {}

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
                        <AdminRowIconButton
                            onClick={() => onEdit(node)}
                            tone="primary"
                            title={t('actions.edit')}
                        >
                            <Edit2 size={15} />
                        </AdminRowIconButton>
                        <AdminRowIconButton
                            onClick={() => onDelete(node.categoryId, node.name)}
                            tone="danger"
                            title={t('actions.delete')}
                        >
                            <Trash2 size={15} />
                        </AdminRowIconButton>
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

export const Categories: React.FC<AdminCategoriesProps> = () => {
    const { t } = useTranslation('categories');
    const { showToast: fireToast } = useToast();
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [flat, setFlat] = useState<CategoryFlat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);

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

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        fireToast({ type, title: message });
    };

    const loadData = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) setLoading(true);
        else setIsRefreshing(true);
        setError(null);
        try {
            const [treeData, flatData] = await Promise.all([
                fetchCategoryTree(),
                fetchCategoryFlat(),
            ]);
            if (requestIdRef.current !== requestId) return;
            setTree(treeData);
            setFlat(flatData);
            setExpandedIds((previousExpandedIds) =>
                isFirstLoad
                    ? getDefaultExpandedCategoryIds(treeData)
                    : getRetainedExpandedCategoryIds(previousExpandedIds, treeData),
            );
            hasLoadedRef.current = true;
        } catch (error) {
            if (requestIdRef.current !== requestId) return;
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message || t('feedback.loadErrorDetail'));
        } finally {
            if (requestIdRef.current !== requestId) return;
            if (isFirstLoad) setLoading(false);
            else setIsRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const refreshCategories = useCallback(() => {
        void loadData();
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
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
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
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setDeleteModal(null);
            showToast(e.message || t('feedback.deleteError'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    const totalCategories = flat.length;
    const rootCount = tree.length;

    return (
        <AdminPageShell className="max-w-[1400px] relative h-full">

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
                <AdminModalShell
                    icon={Trash2}
                    iconWrapperClassName="border-red-500/20 bg-red-500/10 text-red-400 rounded-full"
                    iconClassName="text-red-400"
                    title={t('delete.title')}
                    subtitle={deleteModal.name}
                    onClose={() => !deleting && setDeleteModal(null)}
                    maxWidthClassName="max-w-md"
                    bodyClassName="space-y-5 p-6"
                    footer={(
                        <div className="flex justify-end gap-3">
                            <AdminSecondaryButton
                                onClick={() => setDeleteModal(null)}
                                disabled={deleting}
                                className="px-5 py-2.5"
                            >
                                {t('delete.cancel')}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="bg-red-600 px-5 py-2.5 shadow-lg shadow-red-900/30 hover:bg-red-700"
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleting ? t('delete.deleting') : t('delete.confirm')}
                            </AdminPrimaryButton>
                        </div>
                    )}
                >
                        <p
                            className="text-sm text-white/60 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: t('delete.warning') }}
                        />
                </AdminModalShell>
            )}

            <AdminSectionCard className="flex-1 overflow-hidden" bodyClassName="h-full">
                <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
                    <AdminPageHeader
                        icon={Tag}
                        title={t('page.title')}
                        meta={t('page.summary', { total: totalCategories, roots: rootCount })}
                        actions={(
                            <AdminPrimaryButton onClick={handleOpenCreate}>
                                <Plus size={16} />
                                {t('actions.addCategory')}
                            </AdminPrimaryButton>
                        )}
                    />
                    <AdminRefreshState
                        isRefreshing={isRefreshing && !loading}
                        label={t('feedback.loading')}
                    />
                </div>

            {/* ── Loading ──────────────────────────────────────────────────── */}
            {loading && (
                <div className="flex-1">
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-white/40">{t('feedback.loading')}</p>
                    </div>
                    </div>
                </div>
            )}

            {/* ── Error ────────────────────────────────────────────────────── */}
            {error && !loading && (
                <div className="flex-1">
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                        <AlertCircle size={40} className="text-red-400" />
                        <div>
                            <h3 className="text-base font-bold text-white mb-1">{t('feedback.loadError')}</h3>
                            <p className="text-sm text-white/50">{error}</p>
                        </div>
                        <button
                            onClick={refreshCategories}
                            className="text-xs text-primary font-bold uppercase tracking-wider hover:underline"
                        >
                            {t('actions.retry')}
                        </button>
                    </div>
                    </div>
                </div>
            )}

            {/* ── Tree Table ───────────────────────────────────────────────── */}
            {!loading && !error && (
                <div className="flex-1 overflow-hidden">
                    {tree.length === 0 ? (
                        <AdminEmptyState
                            icon={Tag}
                            title={t('empty.noCategories')}
                            description={t('empty.startHint')}
                            action={(
                                <button
                                    onClick={handleOpenCreate}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                                >
                                    <Plus size={13} /> {t('actions.createFirst')}
                                </button>
                            )}
                        />
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
            </AdminSectionCard>
        </AdminPageShell>
    );
};

