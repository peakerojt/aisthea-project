import React from 'react';
import {
  AdminActionButton,
  AdminSecondaryButton,
  type AdminActionTone,
} from '@/admin/components/AdminUI';
import { refundUi } from '@/common/styles/refundUi';

type FooterAction = {
  key: string;
  label: string;
  onClick: () => void;
  tone: AdminActionTone;
};

type NoteFormConfig = {
  confirmLabel: string;
  placeholder: string;
  title: string;
} | null;

interface ReturnReviewFooterProps {
  actionCancelRejectLabel: string;
  actionContinueRefundLabel: string;
  actionNote: string;
  actionRejectLabel: string;
  actionSendBankReminderLabel: string;
  canReject: boolean;
  closeModalLabel: string;
  hasAvailableBankInfo: boolean;
  hasPrimaryActions: boolean;
  isCompleteRefundModalOpen: boolean;
  isNoteFormVisible: boolean;
  isUploadingProofs: boolean;
  noteFormConfig: NoteFormConfig;
  onCancelNote: () => void;
  onClose: () => void;
  onOpenCompleteRefund: () => void;
  onOpenReject: () => void;
  onSendBankReminder: () => void;
  onSubmitNote: () => void;
  onUpdateActionNote: (value: string) => void;
  primaryAction: FooterAction | null;
  processing: boolean;
  processingLabel: string;
  refundManagementActions: FooterAction[];
  requiresBankRefundCompletion: boolean;
  transactionsTitle: string;
}

export const ReturnReviewFooter: React.FC<ReturnReviewFooterProps> = ({
  actionCancelRejectLabel,
  actionContinueRefundLabel,
  actionNote,
  actionRejectLabel,
  actionSendBankReminderLabel,
  canReject,
  closeModalLabel,
  hasAvailableBankInfo,
  hasPrimaryActions,
  isCompleteRefundModalOpen,
  isNoteFormVisible,
  isUploadingProofs,
  noteFormConfig,
  onCancelNote,
  onClose,
  onOpenCompleteRefund,
  onOpenReject,
  onSendBankReminder,
  onSubmitNote,
  onUpdateActionNote,
  primaryAction,
  processing,
  processingLabel,
  refundManagementActions,
  requiresBankRefundCompletion,
  transactionsTitle,
}) => {
  if (isCompleteRefundModalOpen || (!isNoteFormVisible && !hasPrimaryActions && refundManagementActions.length === 0)) {
    return null;
  }

  if (isNoteFormVisible) {
    return (
      <div className="space-y-3">
        {noteFormConfig && (
          <div className="space-y-2">
            <div className={refundUi.eyeBrow}>
              {noteFormConfig.title}
            </div>
            <textarea
              value={actionNote}
              onChange={(event) => onUpdateActionNote(event.target.value)}
              placeholder={noteFormConfig.placeholder}
              className="min-h-28 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
            />
          </div>
        )}
        <div className="flex gap-3">
          <AdminSecondaryButton
            onClick={onCancelNote}
            className="px-4 py-3 text-xs font-semibold"
          >
            {actionCancelRejectLabel}
          </AdminSecondaryButton>
          <AdminSecondaryButton
            onClick={onClose}
            className="px-4 py-3 text-xs font-semibold"
          >
            {closeModalLabel}
          </AdminSecondaryButton>
          <AdminActionButton
            onClick={onSubmitNote}
            disabled={processing || !actionNote.trim()}
            tone="danger"
            size="md"
            className="flex-1 px-4 py-3 text-xs font-semibold"
          >
            {processing ? processingLabel : noteFormConfig?.confirmLabel ?? actionCancelRejectLabel}
          </AdminActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {refundManagementActions.length > 0 && (
        <div className="space-y-2">
          <div className={refundUi.eyeBrow}>
            {transactionsTitle}
          </div>
          <div className="flex flex-wrap gap-3">
            {refundManagementActions.map((refundAction) => (
              <AdminActionButton
                key={refundAction.key}
                onClick={refundAction.onClick}
                disabled={processing || isUploadingProofs}
                tone={refundAction.tone}
                size="md"
                className="flex-1 cursor-pointer py-3 text-xs font-semibold"
              >
                {processing || isUploadingProofs ? processingLabel : refundAction.label}
              </AdminActionButton>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <AdminSecondaryButton
          onClick={onClose}
          className="px-4 py-3 text-xs font-semibold"
        >
          {closeModalLabel}
        </AdminSecondaryButton>
        {canReject && (
          <AdminActionButton
            onClick={onOpenReject}
            disabled={processing || isUploadingProofs}
            tone="danger"
            size="md"
            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
          >
            {actionRejectLabel}
          </AdminActionButton>
        )}
        {requiresBankRefundCompletion && !hasAvailableBankInfo && (
          <AdminSecondaryButton
            onClick={onSendBankReminder}
            disabled={processing || isUploadingProofs}
            className="px-4 py-3 text-xs font-semibold"
          >
            {actionSendBankReminderLabel}
          </AdminSecondaryButton>
        )}
        {requiresBankRefundCompletion && (
          <AdminActionButton
            onClick={onOpenCompleteRefund}
            disabled={processing || isUploadingProofs || !hasAvailableBankInfo}
            tone="success"
            size="md"
            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
          >
            {processing || isUploadingProofs ? processingLabel : actionContinueRefundLabel}
          </AdminActionButton>
        )}
        {primaryAction && (
          <AdminActionButton
            onClick={primaryAction.onClick}
            disabled={processing || isUploadingProofs}
            tone={primaryAction.tone}
            size="md"
            className="flex-1 cursor-pointer py-3 text-xs font-semibold"
          >
            {processing || isUploadingProofs ? processingLabel : primaryAction.label}
          </AdminActionButton>
        )}
      </div>
    </div>
  );
};
