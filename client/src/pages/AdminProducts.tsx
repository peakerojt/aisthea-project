import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewState } from '../types';
import { useProducts } from '../contexts/ProductContext';
import { deleteProductById } from '../services/product.service';
import { Trash2, Edit2, AlertCircle, CheckCircle2, Archive, Loader2, UploadCloud } from 'lucide-react';
import { BulkImportExportModal } from '../components/BulkImportExportModal';

export const AdminProducts: React.FC<{ setView: (v: ViewState, productId?: number) => void }> = ({ setView }) => {
  const { t } = useTranslation();
  const { products, updateProduct, deleteProduct, loading, error, refreshProducts } = useProducts();

  useEffect(() => {
    refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const [editingCell, setEditingCell] = useState<{ id: string, field: 'price' | 'stock' } | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'archive' | 'error'; visible: boolean } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const filteredProducts = products.filter(product => {
    const statusMatch = statusFilter === 'All' || product.status === statusFilter;
    const categoryMatch = categoryFilter === 'All' || product.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const showToast = (message: string, type: 'success' | 'archive' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteRow = (id: string, name: string) => {
    setDeleteModal({ open: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const result = await deleteProductById(Number(deleteModal.id));
      setDeleteModal(null);
      await refreshProducts();
      showToast(result.message, result.mode === 'archived' ? 'archive' : 'success');
    } catch (err: any) {
      setDeleteModal(null);
      showToast(err.message || t('products:feedback.deleteSuccess'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = () => {
    if (window.confirm(t('products:feedback.deleteSelectedConfirm', { count: selectedIds.length }))) {
      selectedIds.forEach(id => deleteProduct(id));
      setSelectedIds([]);
      showToast(t('products:feedback.deleteSelectedSuccess', { count: selectedIds.length }));
    }
  };

  const markAsInStock = () => {
    selectedIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        updateProduct(id, {
          status: 'In Stock',
          stock: product.stock === 0 ? 10 : product.stock
        });
      }
    });
    setSelectedIds([]);
    showToast(t('products:feedback.markInStockSuccess'));
  };

  const startEditing = (id: string, field: 'price' | 'stock', value: number) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const numValue = Number(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const updates: Partial<Record<string, number>> = { [field]: numValue };
      updateProduct(id, updates);
      showToast(field === 'price' ? t('products:feedback.priceUpdated') : t('products:feedback.stockUpdated'));
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditingCell(null);
  };

  const toggleStatus = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStatus = product.status === 'Out of Stock' ? 'In Stock' : 'Out of Stock';
    const newStock = newStatus === 'In Stock' && product.stock === 0 ? 10 : (newStatus === 'Out of Stock' ? 0 : product.stock);
    updateProduct(id, { status: newStatus, stock: newStock });
    showToast(t('products:feedback.statusUpdated'));
  };

  // Localised status label
  const getStatusLabel = (status: string) => {
    if (status === 'In Stock') return t('products:status.inStock');
    if (status === 'Low Stock') return t('products:status.lowStock');
    if (status === 'Out of Stock') return t('products:status.outOfStock');
    return status;
  };

  const isAllSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id));

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative">
      {/* ── Import/Export Modal ── */}
      {showImportExport && (
        <BulkImportExportModal
          onClose={(didImport) => {
            setShowImportExport(false);
            if (didImport) refreshProducts();
          }}
        />
      )}
      {/* ── Xác nhận xóa ──── */}
      {deleteModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteModal(null)}
          />
          <div className="relative bg-surface-dark border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('products:modal.deleteTitle')}</h3>
                <p className="text-[11px] text-white/40 mt-0.5 font-mono truncate max-w-[280px]">
                  {deleteModal.name}
                </p>
              </div>
            </div>
            <p
              className="text-sm text-white/60 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t('products:modal.deleteWarning') }}
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-red-900/30"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? t('products:modal.deleting') : t('products:modal.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast?.visible && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className={`bg-surface-dark border shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 ${toast.type === 'error'
            ? 'border-red-500/30'
            : toast.type === 'archive'
              ? 'border-yellow-500/30'
              : 'border-emerald-500/20'
            }`}>
            {toast.type === 'error' ? (
              <AlertCircle size={14} className="text-red-400 shrink-0" />
            ) : toast.type === 'archive' ? (
              <Archive size={14} className="text-yellow-400 shrink-0" />
            ) : (
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-medium text-white">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="h-20 flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('products:page.title')}</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{t('products:page.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportExport(true)}
            className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-xs font-bold uppercase tracking-[0.1em] px-5 py-3 rounded shadow-md transition-all"
          >
            <UploadCloud size={15} />
            {t('products:toolbar.importExport')}
          </button>
          <button
            onClick={() => setView('ADMIN_CREATE_PRODUCT')}
            className="bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.1em] px-6 py-3 rounded shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('products:page.create')}
          </button>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-white/60">{t('products:loading')}</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <AlertCircle size={48} className="text-red-500" />
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{t('products:errorTitle')}</h3>
              <p className="text-sm text-white/60">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && (
        <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1">
          {/* Toolbar */}
          <div className={`p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors ${selectedIds.length > 0 ? 'bg-primary/5' : ''}`}>
            {selectedIds.length > 0 ? (
              <div className="w-full flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white">
                    {t('products:toolbar.selected', { count: selectedIds.length })}
                  </span>
                  <div className="h-4 w-px bg-white/10"></div>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold"
                  >
                    {t('products:toolbar.cancel')}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={markAsInStock}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded text-xs uppercase tracking-wider font-bold transition-colors border border-emerald-500/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    {t('products:toolbar.markInStock')}
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs uppercase tracking-wider font-bold transition-colors border border-red-500/20"
                  >
                    <Trash2 size={16} />
                    {t('products:toolbar.deleteSelected')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <button className="text-xs uppercase tracking-widest font-bold text-primary border-b-2 border-primary pb-1">
                    {t('products:tabs.all')}
                  </button>
                  <button className="text-xs uppercase tracking-widest font-bold text-white/40 hover:text-white pb-1 transition-colors">
                    {t('products:tabs.published')}
                  </button>
                  <button className="text-xs uppercase tracking-widest font-bold text-white/40 hover:text-white pb-1 transition-colors">
                    {t('products:tabs.drafts')}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs uppercase tracking-wider transition-colors ${showFilters ? 'bg-white text-black border-white' : 'border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_list</span>
                    {t('products:toolbar.filter')}
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded text-xs uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    {t('products:toolbar.export')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && selectedIds.length === 0 && (
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-wrap gap-6 animate-fade-in">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                  {t('products:table.status')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-primary focus:ring-0 min-w-[140px]"
                >
                  <option value="All">{t('products:status.allStatuses')}</option>
                  <option value="In Stock">{t('products:status.inStock')}</option>
                  <option value="Low Stock">{t('products:status.lowStock')}</option>
                  <option value="Out of Stock">{t('products:status.outOfStock')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                  {t('products:fields.category')}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-primary focus:ring-0 min-w-[140px]"
                >
                  <option value="All">{t('products:status.allCategories')}</option>
                  <option value="Coats & Jackets">{t('products:categories.coats')}</option>
                  <option value="Dresses">{t('products:categories.dresses')}</option>
                  <option value="Accessories">{t('products:categories.accessories')}</option>
                  <option value="Shoes">{t('products:categories.shoes')}</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); }}
                  className="text-xs text-gray-500 hover:text-white uppercase tracking-wider font-bold h-[30px] px-2"
                >
                  {t('products:toolbar.resetFilters')}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02]">
                <tr className="text-[10px] uppercase tracking-widest text-white/50 border-b border-white/5">
                  <th className="px-6 py-4 font-semibold w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-transparent text-primary focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">{t('products:table.product')}</th>
                  <th className="px-6 py-4 font-semibold">{t('products:table.category')}</th>
                  <th className="px-6 py-4 font-semibold">{t('products:table.price')}</th>
                  <th className="px-6 py-4 font-semibold">{t('products:table.inventory')}</th>
                  <th className="px-6 py-4 font-semibold">{t('products:table.status')}</th>
                  <th className="px-6 py-4 font-semibold text-right">{t('products:table.actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isEditingPrice = editingCell?.id === p.id && editingCell.field === 'price';
                  const isEditingStock = editingCell?.id === p.id && editingCell.field === 'stock';

                  return (
                    <tr key={p.id} className={`group transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(p.id)}
                          className="rounded border-white/20 bg-transparent text-primary focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/5">
                            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className={`font-medium transition-colors ${isSelected ? 'text-primary' : 'text-white group-hover:text-primary'}`}>{p.name}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">SKU-{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{p.category}</td>

                      {/* EDITABLE PRICE */}
                      <td className="px-6 py-4">
                        {isEditingPrice ? (
                          <div className="flex items-center gap-1 w-24">
                            <span className="text-gray-500">₫</span>
                            <input
                              autoFocus
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-surface-dark border border-white/20 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none shadow-xl"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => startEditing(p.id, 'price', p.price)}
                            className="text-white/90 cursor-pointer hover:text-white hover:bg-white/5 px-2 py-1 -ml-2 rounded flex items-center gap-1 group/edit w-fit"
                          >
                            <span>{p.price.toLocaleString('vi-VN')}₫</span>
                            <span className="opacity-0 group-hover/edit:opacity-50 ml-1"><Edit2 size={12} /></span>
                          </div>
                        )}
                      </td>

                      {/* EDITABLE STOCK */}
                      <td className="px-6 py-4">
                        {isEditingStock ? (
                          <input
                            autoFocus
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-20 bg-surface-dark border border-white/20 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none shadow-xl"
                          />
                        ) : (
                          <div
                            onClick={() => startEditing(p.id, 'stock', p.stock)}
                            className="flex flex-col cursor-pointer hover:bg-white/5 px-2 py-1 -ml-2 rounded group/edit w-fit"
                          >
                            <span className="text-white/90 flex items-center gap-1">
                              {t('products:table.inStockUnit', { count: p.stock })}
                              <span className="opacity-0 group-hover/edit:opacity-50 ml-1"><Edit2 size={12} /></span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* STATUS TOGGLE */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleStatus(p.id)}
                            className={`w-10 h-5 rounded-full p-1 transition-colors relative flex items-center ${p.status === 'Out of Stock' ? 'bg-gray-700' : 'bg-emerald-500/80'}`}
                            title={p.status === 'Out of Stock' ? t('products:status.inStock') : t('products:status.outOfStock')}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${p.status === 'Out of Stock' ? 'translate-x-0' : 'translate-x-4'}`}></div>
                          </button>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${p.status === 'In Stock' ? 'text-emerald-400' :
                            p.status === 'Out of Stock' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setView('ADMIN_EDIT_PRODUCT', Number(p.id))}
                            className="text-white/40 hover:text-primary transition-colors p-2 rounded hover:bg-white/10"
                            title={t('products:page.edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(p.id, p.name)}
                            className="text-white/40 hover:text-red-500 transition-colors p-2 rounded hover:bg-white/10"
                            title={t('products:modal.delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <AlertCircle size={40} className="mb-2" />
                <p className="text-sm">{t('products:empty.noMatch')}</p>
                <button
                  onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); }}
                  className="mt-4 text-primary text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  {t('products:empty.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
