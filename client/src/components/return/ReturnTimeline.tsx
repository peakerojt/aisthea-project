import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge';

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

// Map hardcoded English backend notes to i18n keys to retroactively translate old logs
const KNOWN_COMMENTS: Record<string, string> = {
  'Return request submitted.': 'Yêu cầu trả hàng đã được gửi.',
  'Return request approved.': 'Yêu cầu trả hàng đã được duyệt.',
  'Return request rejected.': 'Yêu cầu trả hàng đã bị từ chối.',
  'Refund confirmed and stock restored.': 'Hoàn tiền thành công và nhập lại kho.',
};

export function ReturnTimeline({ logs }: { logs: Log[] }) {
  const { t } = useTranslation('returns');

  if (!logs.length)
    return <div className="text-sm text-gray-400 italic">Chưa có lịch sử trạng thái.</div>;

  return (
    <div className="relative">
      {/* Vertical connector */}
      {logs.length > 1 && (
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200" />
      )}

      <ol className="space-y-4">
        {logs.map((log, idx) => {
          const displayComment = log.comment
            ? (KNOWN_COMMENTS[log.comment] || log.comment)
            : null;

          return (
            <li key={log.logId} className="relative flex gap-4 items-start">
              {/* Icon circle */}
              <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-base shadow-sm">
                {ICONS[log.toStatus] ?? '🔄'}
              </div>

              <div className="flex-1 min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={log.toStatus} />
                  {log.fromStatus && (
                    <span className="text-xs text-gray-400">từ {log.fromStatus}</span>
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
                    bởi {log.changedByUser.fullName}
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