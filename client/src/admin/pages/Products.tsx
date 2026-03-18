import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useProductsPageAPI, useUpdateProductStatusMutation } from '@/common/hooks/useProducts';
import { fetchCategories, type CategoryOption } from '@/common/services/product.service';
import { useToast } from '@/common/contexts/ToastContext';
import { EyeOff, Edit2, AlertCircle, Loader2, UploadCloud, ChevronLeft, ChevronRight, Search, Package, Download, Filter } from 'lucide-react';
import {
  AdminActionButton,
  AdminIconButton,
  AdminRowIconButton,
  AdminModalShell,
  AdminPageHeader,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminTabs,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import { BulkImportExportModal } from '@/admin/components/BulkImportExportModal';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

export const Products: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast: fireToast } = useToast();
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceSort, setPriceSort] = useState<string>('default');
  const [productViewTab, setProductViewTab] = useState<'all' | 'inactive' | 'drafts'>('all');

  const serverStatusFilter =
    productViewTab === 'drafts'
      ? 'Draft'
      : productViewTab === 'inactive'
        ? 'InactiveGroup'
        : statusFilter === 'In Stock'
        ? 'Active'
        : statusFilter === 'Out of Stock'
          ? 'Inactive'
          : statusFilter === 'Low Stock'
            ? 'LowStock'
            : undefined;

  const { data: qProducts, isLoading: loading, isFetching, error: qError, refetch: refreshProducts } = useProductsPageAPI({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: categoryFilter !== 'All' ? categoryFilter : undefined,
    sort: priceSort !== 'default' ? priceSort : undefined,
    status: serverStatusFilter,
  });
  const products: any[] = qProducts?.data || [];
  const pagination = qProducts?.meta;
  const error = qError ? (qError as Error).message : null;

  const updateProductStatusMutation = useUpdateProductStatusMutation();

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const initialLoading = loading && !qProducts;

  useEffect(() => {
    setSelectedIds([]);
  }, [page, statusFilter, categoryFilter, priceSort, search]);

  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((loadError) => {
        console.error('Failed to load product categories:', loadError);
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Helper: convert DB status → display status
  const toDisplayStatus = (dbStatus: string, stockQuantity: number) => {
    if (dbStatus === 'Archived') return 'Hidden';
    if (dbStatus === 'Inactive' || stockQuantity <= 0) return 'Out of Stock';
    if (dbStatus === 'Active' && stockQuantity < 10) return 'Low Stock';
    if (dbStatus === 'Active') return 'In Stock';
    return dbStatus; // already a display value (e.g. 'Low Stock')
  };

  // Map backend Product shape → flat shape expected by the table
  const mappedProducts = products.map((p) => {
    const defaultVariant = p.variants?.find((v: { isDefault: boolean; sku: string }) => v.isDefault) ?? p.variants?.[0];
    const primaryImage = p.images?.find((img: { isPrimary: boolean }) => img.isPrimary) ?? p.images?.[0];
    const stock = defaultVariant?.stockQuantity ?? 0;
    return {
      id: String(p.productId),
      name: p.name,
      sku: defaultVariant?.sku ?? '-',
      price: defaultVariant?.price ?? p.basePrice ?? 0,
      stock,
      status: toDisplayStatus(p.status, stock),
      image: primaryImage?.thumbnailUrl ?? primaryImage?.imageUrl ?? '',
      category: p.category?.name ?? '',
      categorySlug: p.category?.slug ?? '',
    };
  });

  const filteredProducts = [...mappedProducts].sort((left, right) => {
    if (priceSort === 'price_asc') {
      return Number(left.price ?? 0) - Number(right.price ?? 0);
    }

    if (priceSort === 'price_desc') {
      return Number(right.price ?? 0) - Number(left.price ?? 0);
    }

    return 0;
  });

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 400);
  };

  const handleResetFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    setSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setPriceSort('default');
    setPage(1);
  };

  const showToast = (message: string, type: 'success' | 'archive' | 'error' = 'success') => {
    const toastType = type === 'error' ? 'error' : 'success';
    fireToast({
      type: toastType,
      title: message,
    });
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
      await updateProductStatusMutation.mutateAsync({
        id: Number(deleteModal.id),
        status: 'Archived',
      });
      setDeleteModal(null);
      await refreshProducts();
      showToast(t('products:feedback.hideSuccess'));
    } catch (error) {
      const err = error as Error | { message?: string; error?: string; data?: unknown };
      setDeleteModal(null);
      showToast(err.message || t('products:feedback.hideSuccess'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const hideSelected = async () => {
    if (window.confirm(t('products:feedback.deleteSelectedConfirm', { count: selectedIds.length }))) {
      await Promise.all(selectedIds.map(id => updateProductStatusMutation.mutateAsync({
        id: Number(id),
        status: 'Archived',
      })));
      setSelectedIds([]);
      showToast(t('products:feedback.deleteSelectedSuccess', { count: selectedIds.length }));
      await refreshProducts();
    }
  };

  const markAsInStock = async () => {
    await Promise.all(selectedIds.map(async id => {
      await updateProductStatusMutation.mutateAsync({
        id: Number(id),
        status: 'Active',
      });
    }));
    setSelectedIds([]);
    showToast(t('products:feedback.markInStockSuccess'));
  };

  const toggleStatus = async (id: string) => {
    const mapped = mappedProducts.find(p => p.id === id);
    if (!mapped) return;
    // Send DB-compatible status values back to the server
    const newDbStatus = mapped.status === 'Out of Stock' || mapped.status === 'Hidden' ? 'Active' : 'Inactive';
    await updateProductStatusMutation.mutateAsync({
      id: Number(id),
      status: newDbStatus,
    });
    showToast(t('products:feedback.statusUpdated'));
  };

  // Localised status label (handles both display values and raw DB values)
  const getStatusLabel = (status: string) => {
    if (status === 'In Stock') return t('products:status.inStock');
    if (status === 'Low Stock') return t('products:status.lowStock');
    if (status === 'Out of Stock') return t('products:status.outOfStock');
    if (status === 'Hidden') return t('products:status.hidden');
    return status;
  };

  const isAllSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id));
  const totalPages = pagination?.totalPages ?? 1;
  const totalProducts = pagination?.total ?? mappedProducts.length;
  const productTabs = [
    { key: 'all', label: t('products:tabs.all') },
    { key: 'inactive', label: t('products:tabs.inactive') },
    { key: 'drafts', label: t('products:tabs.drafts') },
  ];

  return (
    <AdminPageShell className="relative h-full">
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
        <AdminModalShell
          icon={EyeOff}
          iconWrapperClassName="border-amber-500/20 bg-amber-500/10 text-amber-400 rounded-full"
          iconClassName="text-amber-400"
          title={t('products:modal.deleteTitle')}
          subtitle={deleteModal.name}
          onClose={() => !deleting && setDeleteModal(null)}
          maxWidthClassName="max-w-md"
          bodyClassName="space-y-5 p-6"
          footer={(
            <div className="flex justify-end gap-3">
              <AdminSecondaryButton
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-5 py-2.5"
              >
                {t('common:actions.cancel')}
              </AdminSecondaryButton>
              <AdminPrimaryButton
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-amber-600 px-5 py-2.5 shadow-lg shadow-amber-900/20 hover:bg-amber-500"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
                {deleting ? t('products:modal.deleting') : t('products:modal.delete')}
              </AdminPrimaryButton>
            </div>
          )}
        >
            <p
              className="text-sm text-white/60 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t('products:modal.deleteWarning') }}
            />
        </AdminModalShell>
      )}

      {/* ── Loading ── */}
      {initialLoading && (
        <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-white/60">{t('products:loading')}</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !initialLoading && (
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
      {!initialLoading && !error && (
        <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1">
          <div className="border-b border-white/5 p-5 lg:p-6">
            <div className="space-y-5">
              <AdminPageHeader
                icon={Package}
                title={t('products:page.title')}
                subtitle={t('products:page.subtitle')}
                meta={`${totalProducts} ${t('products:page.productCount')}`}
              />

              <AdminToolbar
                actions={(
                  <>
                    <AdminSecondaryButton type="button" onClick={() => setShowImportExport(true)}>
                      <UploadCloud size={15} />
                      {t('products:toolbar.importExport')}
                    </AdminSecondaryButton>
                    <AdminPrimaryButton type="button" onClick={() => navigate('/admin/products/create')}>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      {t('products:page.create')}
                    </AdminPrimaryButton>
                  </>
                )}
              >
                <div className="grid w-full gap-3 md:grid-cols-[minmax(280px,360px)_auto]">
                  <label className="relative">
                    <span className={adminUiTokens.fieldLabel}>Tìm kiếm</span>
                    <Search size={15} className="pointer-events-none absolute left-3 top-[38px] -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder={t('products:toolbar.searchPlaceholder')}
                      className={adminUiTokens.searchFieldControl}
                    />
                  </label>

                  {isFetching && !initialLoading && (
                    <div className="flex items-end">
                      <p className="pb-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                        {t('common:loading', { defaultValue: 'Đang tải' })}
                      </p>
                    </div>
                  )}
                </div>
              </AdminToolbar>
            </div>
          </div>

          {/* Toolbar */}
          <div className={`border-b border-white/5 p-6 transition-colors ${selectedIds.length > 0 ? 'bg-primary/5' : ''}`}>
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
                  <AdminActionButton
                    onClick={markAsInStock}
                    tone="success"
                    size="md"
                    className="text-xs uppercase tracking-wider font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    {t('products:toolbar.markInStock')}
                  </AdminActionButton>
                  <AdminActionButton
                    onClick={hideSelected}
                    tone="warning"
                    size="md"
                    className="text-xs uppercase tracking-wider font-bold"
                  >
                    <EyeOff size={16} />
                    {t('products:toolbar.deleteSelected')}
                  </AdminActionButton>
                </div>
              </div>
            ) : (
              <AdminToolbar
                className="gap-4"
                actions={(
                  <>
                    <AdminSecondaryButton
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={showFilters ? 'border-white/25 bg-white/[0.1] text-white' : ''}
                    >
                      <Filter size={15} />
                      {t('products:toolbar.filter')}
                    </AdminSecondaryButton>
                    <AdminSecondaryButton type="button">
                      <Download size={15} />
                      {t('products:toolbar.export')}
                    </AdminSecondaryButton>
                  </>
                )}
              >
                <AdminTabs
                  items={productTabs}
                  activeKey={productViewTab}
                  onChange={(key) => {
                    setProductViewTab(key as 'all' | 'inactive' | 'drafts');
                    setPage(1);
                  }}
                />
              </AdminToolbar>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && selectedIds.length === 0 && (
            <div className="animate-fade-in border-b border-white/5 bg-white/[0.02] p-6">
              <div className="flex flex-wrap items-end gap-5">
                <div className="min-w-[180px] flex-1 max-w-[240px]">
                  <label className={adminUiTokens.fieldLabel}>
                    {t('products:table.status')}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={adminUiTokens.fieldControl}
                  >
                    <option value="All">{t('products:status.allStatuses')}</option>
                    <option value="In Stock">{t('products:status.inStock')}</option>
                    <option value="Low Stock">{t('products:status.lowStock')}</option>
                    <option value="Out of Stock">{t('products:status.outOfStock')}</option>
                  </select>
                </div>
                <div className="min-w-[180px] flex-1 max-w-[240px]">
                  <label className={adminUiTokens.fieldLabel}>
                    {t('products:fields.category')}
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(1);
                    }}
                    className={adminUiTokens.fieldControl}
                  >
                    <option value="All">{t('products:status.allCategories')}</option>
                    {categories.map((category) => (
                      <option key={category.categoryId} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[180px] flex-1 max-w-[240px]">
                  <label className={adminUiTokens.fieldLabel}>
                    {t('products:fields.priceSort')}
                  </label>
                  <select
                    value={priceSort}
                    onChange={(e) => {
                      setPriceSort(e.target.value);
                      setPage(1);
                    }}
                    className={adminUiTokens.fieldControl}
                  >
                    <option value="default">{t('products:status.defaultSort')}</option>
                    <option value="price_asc">{t('products:status.priceLowToHigh')}</option>
                    <option value="price_desc">{t('products:status.priceHighToLow')}</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <AdminSecondaryButton
                    type="button"
                    onClick={handleResetFilters}
                    className="mb-[1px] px-4"
                  >
                    {t('products:toolbar.resetFilters')}
                  </AdminSecondaryButton>
                </div>
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

                      <td className="px-6 py-4">
                        <span className="text-white/90">{formatCurrency(Number(p.price ?? 0))}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-white/90">{t('products:table.inStockUnit', { count: p.stock })}</span>
                      </td>

                      {/* STATUS TOGGLE */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleStatus(p.id)}
                          disabled={updateProductStatusMutation.isPending}
                          aria-pressed={p.status !== 'Out of Stock'}
                          className="inline-flex items-center gap-3 rounded-full border border-transparent px-1 py-1 text-left transition-colors hover:border-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          title={p.status === 'Out of Stock' ? t('products:status.inStock') : t('products:status.outOfStock')}
                        >
                          <span
                            className={`w-10 h-5 rounded-full p-1 transition-colors relative flex items-center ${p.status === 'Out of Stock' ? 'bg-gray-700' : 'bg-emerald-500/80'}`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${p.status === 'Out of Stock' ? 'translate-x-0' : 'translate-x-4'}`}></span>
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${p.status === 'In Stock' ? 'text-emerald-400' :
                            p.status === 'Out of Stock' ? 'text-red-400' :
                              p.status === 'Hidden' ? 'text-amber-400' :
                              'text-yellow-400'
                            }`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AdminRowIconButton
                            onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                            tone="primary"
                            title={t('products:page.edit')}
                          >
                            <Edit2 size={16} />
                          </AdminRowIconButton>
                          <AdminRowIconButton
                            onClick={() => handleDeleteRow(p.id, p.name)}
                            tone="default"
                            title={t('products:modal.delete')}
                          >
                            <EyeOff size={18} />
                          </AdminRowIconButton>
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
                  onClick={handleResetFilters}
                  className="mt-4 text-primary text-xs font-bold uppercase tracking-wider hover:underline"
                >
                  {t('products:empty.clearFilters')}
                </button>
              </div>
            )}
          </div>
          {!initialLoading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
              <p className="text-xs text-white/40">
                {t('products:pagination.summary', { page, totalPages, total: totalProducts })}
              </p>
              <div className="flex items-center gap-2">
                <AdminIconButton
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-lg text-white/50 hover:border-white/20 hover:text-white"
                >
                  <ChevronLeft size={15} />
                </AdminIconButton>
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  const pageNumber = Math.max(1, Math.min(page - 2, totalPages - 4)) + index;
                  return (
                    <AdminActionButton
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      tone={pageNumber === page ? 'primary' : 'default'}
                      variant={pageNumber === page ? 'solid' : 'soft'}
                      className="h-8 w-8 rounded-lg px-0 text-xs font-bold"
                    >
                      {pageNumber}
                    </AdminActionButton>
                  );
                })}
                <AdminIconButton
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-lg text-white/50 hover:border-white/20 hover:text-white"
                >
                  <ChevronRight size={15} />
                </AdminIconButton>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  );
};
