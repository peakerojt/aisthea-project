import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminReturnService, returnService } from '../services/return.service';
import { formatVietnamTime } from '../utils/formatDate';
import { api } from '../utils/api';
import { StatusBadge } from '../components/return/StatusBadge';
import { ReturnItemsTable } from '../components/return/ReturnItemsTable';
import { ReturnTimeline } from '../components/return/ReturnTimeline';
import { ReasonLabel } from '../components/return/ReasonLabel';
import { ViewState } from '../types';

interface Props {
  returnId: number;
  setView: (v: ViewState) => void;
}

// ─── Simple toast notification ───────────────────────────────────────────────
function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 mb-4 ${type === 'success'
        ? 'border-green-500/30 bg-green-500/10 text-green-300'
        : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}
    >
      <span>{type === 'success' ? '✅' : '⚠️'}</span>
      <p className="flex-1 text-sm">{msg}</p>
      <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminReturnDetailPage: React.FC<Props> = ({ returnId, setView }) => {
  const { t } = useTranslation(['returns']);
  const queryClient = useQueryClient();

  // Toast state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const query = useQuery({
    queryKey: ['admin-return-detail', returnId],
    queryFn: async () => {
      const res = await api.get(`/api/returns/${returnId}`);
      return (res as any).data?.data ?? (res as any).data;
    },
    enabled: returnId > 0,
  });

  const detail = useMemo(() => query.data?.data ?? query.data, [query.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-return-detail', returnId] });
    queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
  };

  const showToast = (msg: string, type: 'success' | 'error') => setToast({ msg, type });

  const onMutateSuccess = (msg: string) => {
    showToast(msg, 'success');
    invalidate();
  };
  const onMutateError = (err: any, fallback: string) => {
    showToast(err?.response?.data?.error?.message ?? err?.message ?? fallback, 'error');
  };

  const approveMut = useMutation({
    mutationFn: () => adminReturnService.process(returnId, 'APPROVE'),
    onSuccess: () => onMutateSuccess(t('feedback.approveSuccess')),
    onError: (e: any) => onMutateError(e, t('feedback.approveError')),
  });

  const rejectMut = useMutation({
    mutationFn: () => adminReturnService.process(returnId, 'REJECT', rejectReason),
    onSuccess: () => {
      onMutateSuccess(t('feedback.rejectSuccess'));
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: (e: any) => onMutateError(e, t('feedback.rejectError')),
  });

  const refundMut = useMutation({
    mutationFn: () => adminReturnService.process(returnId, 'COMPLETE_REFUND'),
    onSuccess: () => {
      onMutateSuccess(t('feedback.refundSuccess'));
    },
    onError: (e: any) => onMutateError(e, t('feedback.refundError')),
  });

  if (query.isLoading)
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-white/10" />
        <div className="h-28 rounded-xl bg-white/5 border border-white/10" />
        <div className="h-40 rounded-xl bg-white/5 border border-white/10" />
      </div>
    );

  if (!detail)
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
          {t('detail.notFound', { id: returnId })}
        </div>
      </div>
    );

  const status = detail.status as string;

  const actionDisabled = (mut: any) => mut.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Reject modal */}
      {showRejectModal && (
        <Modal title={t('detail.rejectModalTitle')} onClose={() => setShowRejectModal(false)}>
          <p className="text-sm text-white/60 mb-3">
            {t('detail.rejectModalDesc')}
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('detail.rejectReasonPlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              disabled={!rejectReason.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
              id="confirm-reject-btn"
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40 transition-colors"
            >
              {rejectMut.isPending ? t('detail.processing') : t('detail.confirmReject')}
            </button>
            <button
              onClick={() => setShowRejectModal(false)}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
            >
              {t('detail.cancel')}
            </button>
          </div>
        </Modal>
      )}



      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('detail.headerTitle', { id: detail.returnRequestId })}
          </h1>
          <p className="mt-0.5 text-sm text-white/50">
            {t('detail.headerSubtitle', { orderId: detail.orderId, date: formatVietnamTime(detail.createdAt) })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={detail.status} />
          <button
            onClick={() => setView('ADMIN_RETURNS')}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            {t('detail.backToList')}
          </button>
        </div>
      </div>

      {/* Info + Customer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h2 className="font-semibold text-white text-sm mb-2">{t('detail.infoTitle')}</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-white/50">{t('detail.infoReason')}</dt>
            <dd><ReasonLabel reason={detail.reason} /></dd>
            <dt className="text-white/50">{t('detail.infoExpectedRefund')}</dt>
            <dd className="font-semibold text-green-400">
              {Number(detail.totalRefundAmount).toLocaleString('vi-VN')}đ
            </dd>
            {detail.note && (
              <>
                <dt className="text-white/50">{t('detail.infoNote')}</dt>
                <dd className="text-white/80 col-span-1">{detail.note}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h2 className="font-semibold text-white text-sm mb-2">{t('detail.customerTitle')}</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-white/50">{t('detail.customerName')}</dt>
            <dd className="text-white/80">{detail.user?.fullName ?? '—'}</dd>
            <dt className="text-white/50">{t('detail.customerEmail')}</dt>
            <dd className="text-white/80 truncate">{detail.user?.email ?? '—'}</dd>
          </dl>
        </div>
      </div>

      {/* Items */}
      <div>
        <h2 className="mb-3 font-semibold text-white">{t('detail.itemsTitle')}</h2>
        <ReturnItemsTable items={detail.items ?? []} />
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold text-white mb-4 text-sm">{t('detail.actionsTitle')}</h2>
        <div className="flex flex-wrap gap-3">
          {/* Approve — only from PENDING_APPROVAL */}
          <button
            id="approve-btn"
            disabled={status !== 'PENDING_APPROVAL' || actionDisabled(approveMut)}
            onClick={() => approveMut.mutate()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {t('detail.actionApprove')}
          </button>

          {/* Reject — only from PENDING_APPROVAL */}
          <button
            id="reject-btn"
            disabled={status !== 'PENDING_APPROVAL'}
            onClick={() => setShowRejectModal(true)}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40 transition-colors"
          >
            {t('detail.actionReject')}
          </button>

          {/* Refund — only from APPROVED */}
          <button
            id="refund-btn"
            disabled={status !== 'APPROVED' || refundMut.isPending}
            onClick={() => refundMut.mutate()}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-40 transition-colors"
          >
            {t('detail.actionRefund')}
          </button>
        </div>

        {status === 'REJECTED' && (
          <p className="mt-3 text-xs text-white/40">
            {t('detail.rejectedNotice')}
          </p>
        )}
        {status === 'COMPLETED' && (
          <p className="mt-3 text-xs text-white/40">
            {t('detail.refundedNotice')}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div>
        <h2 className="mb-3 font-semibold text-white">{t('detail.timelineTitle')}</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <ReturnTimeline logs={detail.statusLogs ?? []} />
        </div>
      </div>

      {/* Refund Transactions */}
      {Array.isArray(detail.refundTransactions) && detail.refundTransactions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">{t('detail.transactionsTitle')}</h2>
          <div className="space-y-2">
            {detail.refundTransactions.map((t: any) => (
              <div
                key={t.transactionId}
                className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-green-300">
                    {Number(t.amount).toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-green-300/60 ml-2">· {t.method}</span>
                </div>
                <div className="text-right text-xs text-green-300/60">
                  <div>{t.status}</div>
                  {t.transactionRef && <div>{t.transactionRef}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
