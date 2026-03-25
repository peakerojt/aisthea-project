import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/common/components/StatusBadge';
import { normalizeReturnStatus } from '@/common/utils/returnStatus';

interface Log {
  logId: number;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  createdAt: string;
  changedByUser?: { fullName?: string | null } | null;
}

const ICONS: Record<string, string> = {
  REQUESTED: '📤',
  APPROVED: '✅',
  REJECTED: '❌',
  RECEIVED: '📬',
  REFUNDED: '💰',
};

// Map hardcoded English backend notes to i18n keys to retroactively translate old logs.
const KNOWN_COMMENT_KEYS: Record<string, string> = {
  'Customer created return request': 'timeline.comments.customerCreatedReturnRequest',
  'Return request submitted.': 'timeline.comments.returnRequestSubmitted',
  'Return request approved.': 'timeline.comments.returnRequestApproved',
  'Return request rejected.': 'timeline.comments.returnRequestRejected',
  'Refund confirmed and stock restored.': 'timeline.comments.refundConfirmedAndStockRestored',
};

export function ReturnTimeline({ logs }: { logs: Log[] }) {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const knownCommentFallbacks: Record<string, string> = {
    'timeline.comments.customerCreatedReturnRequest': 'Khách hàng đã gửi yêu cầu trả hàng.',
    'timeline.comments.returnRequestSubmitted': 'Yêu cầu trả hàng đã được gửi.',
    'timeline.comments.returnRequestApproved': 'Yêu cầu trả hàng đã được duyệt.',
    'timeline.comments.returnRequestRejected': 'Yêu cầu trả hàng đã bị từ chối.',
    'timeline.comments.refundConfirmedAndStockRestored': 'Hoàn tiền thành công và nhập lại kho.',
  };

  if (!logs.length)
    return (
      <div className="text-sm text-gray-400 italic">
        {resolveText('timeline.empty', 'Chưa có lịch sử trạng thái.')}
      </div>
    );

  return (
    <div className="relative">
      {/* Vertical connector */}
      {logs.length > 1 && (
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />
      )}

      <ol className="space-y-4">
        {logs.map((log) => {
          const toStatus = normalizeReturnStatus(log.toStatus);
          const fromStatus = log.fromStatus ? normalizeReturnStatus(log.fromStatus) : '';
          const displayStatus = fromStatus
            ? resolveText(
              `status.${fromStatus}`,
              ({
                REQUESTED: 'Chờ duyệt',
                APPROVED: 'Đã duyệt',
                REJECTED: 'Đã từ chối',
                RECEIVED: 'Đã nhận hàng',
                REFUNDED: 'Đã hoàn tiền',
              } as Record<string, string>)[fromStatus] ?? fromStatus,
            )
            : null;
          const displayComment = log.comment
            ? (KNOWN_COMMENT_KEYS[log.comment]
              ? resolveText(
                KNOWN_COMMENT_KEYS[log.comment],
                knownCommentFallbacks[KNOWN_COMMENT_KEYS[log.comment]] ?? log.comment,
              )
              : log.comment)
            : null;

          return (
            <li key={log.logId} className="relative flex gap-4 items-start">
              {/* Icon circle */}
              <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-base shadow-sm">
                {ICONS[toStatus] ?? '🔄'}
              </div>

              <div className="flex-1 min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={toStatus} />
                  {displayStatus && (
                    <span className="text-xs text-gray-400">
                      {resolveText('timeline.fromStatus', 'từ {{status}}', { status: displayStatus })}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {displayComment && (
                  <p className="mt-1 text-sm text-gray-600 leading-snug">{displayComment}</p>
                )}

                {log.changedByUser?.fullName && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {resolveText('timeline.changedBy', 'bởi {{name}}', {
                      name: log.changedByUser.fullName,
                    })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
