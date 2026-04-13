import React from 'react';
import { ImagePlus, Landmark, Trash2, X } from 'lucide-react';
import { AdminActionButton, AdminSecondaryButton } from '@/admin/components/AdminUI';
import { formatAdminReturnMoneyVND } from '@/admin/utils/returns.utils';
import { refundUi } from '@/common/styles/refundUi';

type ProofUpload = {
  fileName?: string | null;
  fileUrl: string;
};

interface ReturnReviewCompleteRefundDialogProps {
  actionCancelRejectLabel: string;
  actionConfirmCompleteRefundLabel: string;
  bankAccountNumberDisplay: string;
  bankName: string | null | undefined;
  closeModalLabel: string;
  expectedRefundAmount: number;
  financeNoteLabel: string;
  isOpen: boolean;
  isUploadingProofs: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRefundAmountChange: (value: string) => void;
  onRefundFinanceNoteChange: (value: string) => void;
  onRefundTransactionRefChange: (value: string) => void;
  onRemoveProofUpload: (fileUrl: string) => void;
  onUploadProofFiles: (files: FileList | null) => void;
  orderInfoLabel: string;
  processing: boolean;
  processingLabel: string;
  proofImageAlt: (index?: number) => string;
  proofUploads: ProofUpload[];
  refundAmount: string;
  refundFinanceNote: string;
  refundTransactionRef: string;
  resolveText: (key: string, fallback: string, options?: Record<string, unknown>) => string;
  shouldDisableSubmit: boolean;
  toast: string | null;
}

export const ReturnReviewCompleteRefundDialog: React.FC<ReturnReviewCompleteRefundDialogProps> = ({
  actionCancelRejectLabel,
  actionConfirmCompleteRefundLabel,
  bankAccountNumberDisplay,
  bankName,
  closeModalLabel,
  expectedRefundAmount,
  financeNoteLabel,
  isOpen,
  isUploadingProofs,
  onClose,
  onConfirm,
  onRefundAmountChange,
  onRefundFinanceNoteChange,
  onRefundTransactionRefChange,
  onRemoveProofUpload,
  onUploadProofFiles,
  orderInfoLabel,
  processing,
  processingLabel,
  proofImageAlt,
  proofUploads,
  refundAmount,
  refundFinanceNote,
  refundTransactionRef,
  resolveText,
  shouldDisableSubmit,
  toast,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 md:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={resolveText('modal.completeRefundTitle', 'Xác nhận chuyển khoản hoàn tiền')}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-[0_20px_60px_rgba(0,0,0,0.38)] md:max-h-[calc(100vh-2rem)]"
      >
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-gray-200/10 px-6 py-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[1.35rem] font-black leading-tight text-white">
                {resolveText('modal.completeRefundTitle', 'Xác nhận chuyển khoản hoàn tiền')}
              </h2>
              <p className="mt-1 truncate text-sm text-white/35">
                {orderInfoLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={closeModalLabel}
            className="ui-stable-click inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-6">
          <div className={`${refundUi.sectionMuted} grid gap-4 p-4 md:grid-cols-3`}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                {resolveText('modal.completeRefundExpectedAmount', 'Hoàn tiền dự kiến')}
              </div>
              <div className="mt-2 text-sm font-semibold text-emerald-300">
                {expectedRefundAmount > 0 ? formatAdminReturnMoneyVND(expectedRefundAmount) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                {resolveText('modal.completeRefundBank', 'Ngân hàng nhận')}
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {bankName ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                {resolveText('modal.completeRefundAccountNumber', 'Số tài khoản')}
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {bankAccountNumberDisplay}
              </div>
            </div>
          </div>

          <div className={`${refundUi.sectionMuted} space-y-4 p-4`}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {resolveText('modal.completeRefundAmount', 'Số tiền hoàn')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  aria-label={resolveText('modal.completeRefundAmount', 'Số tiền hoàn')}
                  value={refundAmount}
                  onChange={(event) => onRefundAmountChange(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  placeholder={String(Math.round(expectedRefundAmount))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {resolveText('modal.completeRefundTransactionRef', 'Mã giao dịch')}
                </label>
                <input
                  type="text"
                  aria-label={resolveText('modal.completeRefundTransactionRef', 'Mã giao dịch')}
                  value={refundTransactionRef}
                  onChange={(event) => onRefundTransactionRefChange(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  placeholder={resolveText('modal.completeRefundTransactionRefPlaceholder', 'Ví dụ: VCB240403-001')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                {financeNoteLabel}
              </label>
              <textarea
                aria-label={financeNoteLabel}
                value={refundFinanceNote}
                onChange={(event) => onRefundFinanceNoteChange(event.target.value)}
                placeholder={resolveText(
                  'modal.completeRefundFinanceNotePlaceholder',
                  'Ghi chú nội bộ về lần chuyển khoản này...',
                )}
                className="min-h-28 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {resolveText('modal.completeRefundProofTitle', 'Ảnh minh chứng chuyển khoản')}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {resolveText(
                      'modal.completeRefundProofHint',
                      'Tải lên ít nhất một ảnh để lưu vào hồ sơ hoàn tiền của yêu cầu này.',
                    )}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:text-white">
                  <ImagePlus className="h-4 w-4" />
                  {isUploadingProofs
                    ? processingLabel
                    : resolveText('modal.completeRefundUploadProof', 'Tải ảnh lên')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      onUploadProofFiles(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>

              {proofUploads.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {proofUploads.map((proof, index) => (
                    <div
                      key={`${proof.fileUrl}-${index}`}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                    >
                      <div className="relative aspect-[4/3] bg-black/20">
                        <img
                          src={proof.fileUrl}
                          alt={proof.fileName ?? proofImageAlt(index + 1)}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0 text-xs text-white/65">
                          <div className="truncate">
                            {proof.fileName ?? resolveText('modal.completeRefundProofLabel', 'Ảnh minh chứng {{index}}', {
                              index: index + 1,
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveProofUpload(proof.fileUrl)}
                          className="rounded-full border border-red-400/20 p-2 text-red-200 transition hover:border-red-400/40 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
                  {resolveText('modal.completeRefundProofEmpty', 'Chưa có ảnh minh chứng nào được tải lên.')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200/10 px-6 py-5">
          <div className="space-y-3">
            {toast && (
              <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {toast}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <AdminSecondaryButton
                onClick={onClose}
                className="px-4 py-3 text-xs font-semibold"
              >
                {actionCancelRejectLabel}
              </AdminSecondaryButton>
              <AdminActionButton
                onClick={onConfirm}
                disabled={shouldDisableSubmit}
                tone="success"
                size="md"
                className="flex-1 cursor-pointer py-3 text-xs font-semibold"
              >
                {processing || isUploadingProofs ? processingLabel : actionConfirmCompleteRefundLabel}
              </AdminActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
