import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminReturnService } from '../services/return.service';
import { StatusBadge } from '../components/return/StatusBadge';
import { ViewState } from '../types';

interface Props {
  setView: (v: ViewState) => void;
  setReturnId: (id: number) => void;
}

const STATUSES = ['', 'REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED'];

export const AdminReturnsListPage: React.FC<Props> = ({ setView, setReturnId }) => {
  const { t } = useTranslation(['returns']);
  const [status, setStatus] = useState('');
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const query = useQuery({
    queryKey: ['admin-returns', status, orderId, customerId, fromDate, toDate, page],
    queryFn: async () => {
      const res = await adminReturnService.list({
        status: status || undefined,
        page,
        pageSize: limit,
      });
      return res;
    },
  });

  const rows = useMemo(() => query.data?.returns ?? [], [query.data]);
  const total: number = query.data?.pagination.total ?? 0;
  const totalPages: number = query.data?.pagination.totalPages ?? Math.ceil(total / limit);

  const handleFilter = () => setPage(1);
  const handleClear = () => {
    setStatus('');
    setOrderId('');
    setCustomerId('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('page.listTitle')}</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {total > 0 ? t('page.listSubtitleCount', { count: total }) : t('page.listSubtitleEmpty')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Status */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('filters.statusLabel')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="text-black bg-white">
                  {s ? t(`status.${s}`) : t('filters.all')}
                </option>
              ))}
            </select>
          </div>

          {/* Order ID */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('filters.orderIdLabel')}</label>
            <input
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t('filters.orderIdPlaceholder')}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* Customer ID */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('filters.customerIdLabel')}</label>
            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder={t('filters.customerIdPlaceholder')}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('filters.fromDate')}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs text-white/50 mb-1">{t('filters.toDate')}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleFilter}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
          >
            {t('filters.apply')}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
          >
            {t('filters.clear')}
          </button>
        </div>
      </div>

      {/* Table */}
      {query.isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-white/5 border border-white/10" />
          ))}
        </div>
      )}

      {query.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
          {t('feedback.fetchError')}
        </div>
      )}

      {!query.isLoading && !query.isError && (
        <>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-white/70">{t('table.emptyList')}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[80px_1fr_180px_160px_140px] gap-0 bg-white/5 border-b border-white/10 px-4 py-2 text-xs font-semibold text-white/50 uppercase tracking-wide">
                <div>{t('table.colId')}</div>
                <div>{t('table.colCustomer')}</div>
                <div>{t('table.colOrder')}</div>
                <div>{t('table.colRefund')}</div>
                <div>{t('table.colStatus')}</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {rows.map((r: any) => (
                  <button
                    key={r.returnId}
                    id={`admin-return-row-${r.returnId}`}
                    onClick={() => {
                      setReturnId(r.returnId);
                      setView('ADMIN_RETURN_DETAIL');
                    }}
                    className="w-full grid grid-cols-[80px_1fr_180px_160px_140px] gap-0 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="text-white font-mono font-medium">#{r.returnId}</div>
                    <div>
                      <div className="font-medium text-white text-sm truncate">
                        {r.user?.fullName ?? '—'}
                      </div>
                      <div className="text-xs text-white/40 truncate">{r.user?.email}</div>
                    </div>
                    <div className="text-sm text-white/70">
                      #{r.orderId}
                      <div className="text-xs text-white/40">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-400">
                      {Number(r.order?.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                    </div>
                    <div>
                      <StatusBadge status={r.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">
                {t('pagination.info', { page, totalPages, total })}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 disabled:opacity-40 hover:bg-white/10 transition-colors"
                >
                  {t('pagination.prevArrow')}
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 disabled:opacity-40 hover:bg-white/10 transition-colors"
                >
                  {t('pagination.nextArrow')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
