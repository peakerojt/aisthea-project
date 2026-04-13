import React from 'react';
import { AlertTriangle, Landmark } from 'lucide-react';
import type { OrderReturn } from '@/common/services/return.types';
import { refundUi } from '@/common/styles/refundUi';
import { formatAdminReturnDateTime } from '@/admin/utils/returns.utils';
import { getCloudinaryQrImage } from '@/common/utils/cloudinary';

interface ReturnReviewBankInfoSectionProps {
  activeItem: OrderReturn;
  bankAccountNumberDisplay: string;
  canManageRefundWorkflow: boolean;
  financeActionRestrictedLabel: string;
  formatText: (key: string, fallback: string, options?: Record<string, unknown>) => string;
  hasAvailableBankInfo: boolean;
  isRefundLocked: boolean;
  workflowStatus: string;
}

export const ReturnReviewBankInfoSection: React.FC<ReturnReviewBankInfoSectionProps> = ({
  activeItem,
  bankAccountNumberDisplay,
  canManageRefundWorkflow,
  financeActionRestrictedLabel,
  formatText,
  hasAvailableBankInfo,
  isRefundLocked,
  workflowStatus,
}) => {
  if (isRefundLocked) {
    return null;
  }

  const bankInfo = activeItem.bankInfo ?? null;
  const shouldShowRestrictedNotice = workflowStatus === 'ACCEPTED_FOR_REFUND' && !canManageRefundWorkflow;
  const shouldShowBankInfo = canManageRefundWorkflow && (
    workflowStatus === 'ACCEPTED_FOR_REFUND' || activeItem.bankInfo || activeItem.refundCompletedAt
  );

  return (
    <>
      {shouldShowRestrictedNotice && (
        <div className={`${refundUi.info} p-4 text-sm text-sky-100`}>
          {financeActionRestrictedLabel}
        </div>
      )}

      {shouldShowBankInfo && (
        <div className="space-y-3">
          <div className={refundUi.eyeBrow}>
            {formatText('modal.bankInfoTitle', 'Thông tin nhận hoàn tiền')}
          </div>
          {hasAvailableBankInfo ? (
            <div className={`${refundUi.sectionMuted} grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_11rem]`}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Landmark className="h-4 w-4 text-emerald-300" />
                  <span>{bankInfo?.bankName ?? '—'}</span>
                  {bankInfo?.bankCode && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
                      {bankInfo.bankCode}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 text-sm text-white/75 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      {formatText('modal.bankAccountHolder', 'Chủ tài khoản')}
                    </div>
                    <div className="mt-1 text-white">{bankInfo?.accountHolder ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      {formatText('modal.bankAccountNumber', 'Số tài khoản')}
                    </div>
                    <div className="mt-1 text-white">{bankAccountNumberDisplay}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      {formatText('modal.bankInfoSource', 'Nguồn thông tin')}
                    </div>
                    <div className="mt-1 text-white/70">
                      {bankInfo?.source ?? formatText('modal.bankInfoProfileSource', 'Hồ sơ khách hàng')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      {formatText('modal.bankInfoUpdatedAt', 'Cập nhật lần cuối')}
                    </div>
                    <div className="mt-1 text-white/70">
                      {bankInfo?.updatedAt ? formatAdminReturnDateTime(bankInfo.updatedAt) : '—'}
                    </div>
                  </div>
                </div>
                {(activeItem.bankInfoRequestedAt || activeItem.bankInfoSubmittedAt) && (
                  <div className="grid gap-2 border-t border-white/8 pt-3 text-[11px] text-white/55 md:grid-cols-2">
                    <div>
                      {formatText('modal.bankInfoRequestedAt', 'Yêu cầu cung cấp: {{date}}', {
                        date: activeItem.bankInfoRequestedAt
                          ? formatAdminReturnDateTime(activeItem.bankInfoRequestedAt)
                          : '—',
                      })}
                    </div>
                    <div>
                      {formatText('modal.bankInfoSubmittedAt', 'Khách cập nhật: {{date}}', {
                        date: activeItem.bankInfoSubmittedAt
                          ? formatAdminReturnDateTime(activeItem.bankInfoSubmittedAt)
                          : '—',
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/32">
                  {formatText('modal.bankQrLabel', 'QR nhận tiền')}
                </div>
                {bankInfo?.qrImageUrl ? (
                  <img
                    src={getCloudinaryQrImage(bankInfo.qrImageUrl, 900, 900)}
                    alt={formatText('modal.bankQrAlt', 'QR tài khoản ngân hàng')}
                    className="h-auto min-h-32 w-full rounded-xl object-contain bg-white/[0.03] p-2"
                  />
                ) : (
                  <div className="flex min-h-32 items-center justify-center px-4 text-center text-xs text-white/45">
                    {formatText('modal.bankQrEmpty', 'Chưa có ảnh QR cho tài khoản này.')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`${refundUi.warning} flex items-start gap-3 p-4 text-sm text-amber-100`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">
                  {formatText('modal.bankInfoMissing', 'Khách hàng chưa cung cấp thông tin ngân hàng để hoàn tiền.')}
                </div>
                <div className="text-xs text-amber-100/80">
                  {formatText(
                    'modal.bankInfoMissingHint',
                    'Hãy yêu cầu khách cập nhật mục tài khoản nhận hoàn tiền trong hồ sơ trước khi xác nhận chuyển khoản.',
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
