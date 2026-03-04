import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Package, ChevronLeft, ChevronRight, Eye,
  Loader2, AlertCircle, FilterX, Calendar,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ViewState } from '../types';
import { adminOrderService, AdminOrder } from '../services/order.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'ALL', translationKey: 'filters.all' },
  { key: 'Pending', translationKey: 'status.Pending' },
  { key: 'Processing', translationKey: 'status.Processing' },
  { key: 'Shipping', translationKey: 'status.Shipping' },
  { key: 'Delivered', translationKey: 'status.Delivered' },
  { key: 'Cancelled', translationKey: 'status.Cancelled' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: VND formatter
// ─────────────────────────────────────────────────────────────────────────────

export const formatVND = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Status badge colors
// ─────────────────────────────────────────────────────────────────────────────

export const getOrderStatusColor = (status: string | null | undefined) => {
  switch (status) {
    case 'PENDING':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400 animate-pulse',
      };
    case 'PROCESSING':
      return {
        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        dot: 'bg-sky-400',
      };
    case 'SHIPPING':
      return {
        badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        dot: 'bg-violet-400',
      };
    case 'COMPLETED':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
      };
    case 'CANCELLED':
      return {
        badge: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-400',
      };
    default:
      return {
        badge: 'bg-white/5 text-white/40 border-white/10',
        dot: 'bg-white/40',
      };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge Component
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; label: string }> = ({ status, label }) => {
  const { badge, dot } = getOrderStatusColor(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AdminOrdersProps {
  setView: (view: ViewState, orderId?: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export const AdminOrders: React.FC<AdminOrdersProps> = ({ setView }) => {
  const { t } = useTranslation(['orders']);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminOrderService.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setOrders(res.orders);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || t('page.loadError'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(e.target.value);
      setPage(1);
    }, 400);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setActiveTab('ALL');
    setPage(1);
  };

  const hasFilters = !!search || !!startDate || !!endDate;

  // ── Date formatter ────────────────────────────────────────────────────────

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-8 max-w-[1600px] mx-auto h-full flex flex-col"
      style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Package size={18} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('page.title')}</h2>
          </div>
          <p className="text-[11px] text-white/40 uppercase tracking-widest mt-1 pl-12">
            {t('page.orderCount', { count: total })}
          </p>
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={t('filters.searchPlaceholderAdmin')}
            className="bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 w-72 transition-all"
          />
        </div>
      </header>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Date pickers */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-white/30" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-primary/40 transition-colors"
          />
          <span className="text-white/30 text-xs">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            <FilterX size={13} /> {t('filters.clear')}
          </button>
        )}
      </div>

      {/* ── Main Card ──────────────────────────────────────────────────── */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl flex flex-col flex-1 overflow-hidden">

        {/* Status Tabs */}
        <div className="flex border-b border-white/[0.06] overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`
                relative px-5 py-4 text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.key
                  ? 'text-primary'
                  : 'text-white/40 hover:text-white/70'}
              `}
            >
              {t(tab.translationKey)}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-white/40">{t('page.loading')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <AlertCircle size={40} className="text-red-400" />
              <div>
                <h3 className="text-base font-bold text-white mb-1">{t('page.dataError')}</h3>
                <p className="text-sm text-white/50">{error}</p>
              </div>
              <button onClick={loadOrders} className="text-xs text-primary font-bold uppercase tracking-wider hover:underline">
                {t('page.retry')}
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <Package size={28} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white/60">{t('page.noOrders')}</p>
              <p className="text-sm text-white/30 mt-1">{t('page.changeFilter')}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">{t('table.orderId')}</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">{t('table.customer')}</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">{t('table.date')}</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">{t('table.total')}</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30">{t('table.status')}</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-bold text-white/30 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="group hover:bg-white/[0.025] transition-colors"
                  >
                    {/* Mã đơn */}
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-white font-mono">
                        {order.orderNumber}
                      </span>
                      <p className="text-[10px] text-white/30 mt-0.5">{t('table.itemCount', { count: order.itemCount })}</p>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60 uppercase shrink-0">
                          {order.customerName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm text-white/90 font-medium leading-none">
                            {order.customerName}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">{order.customerPhone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Ngày đặt */}
                    <td className="py-4 px-6 text-sm text-white/50">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-white">
                        {formatVND(order.totalAmount)}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-6">
                      <StatusBadge
                        status={order.status ?? ''}
                        label={order.status ? t(`status.${order.status}`) : order.statusLabel ?? ''}
                      />
                    </td>

                    {/* Thao tác */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setView('ADMIN_ORDER_DETAIL', order.orderId)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white/60 bg-white/[0.04] border border-white/10 hover:text-white hover:bg-white/10 transition-all group-hover:border-white/20"
                      >
                        <Eye size={13} />
                        {t('actions.viewDetail')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/40">
              {t('pagination', { page, totalPages, total })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-white/10 text-white/50 hover:text-white hover:border-white/20'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};