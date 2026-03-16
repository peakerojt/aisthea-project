import React from 'react';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; ring: string; dot: string }
> = {
  REQUESTED: {
    label: 'Chờ duyệt',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-400',
  },
  APPROVED: {
    label: 'Đã duyệt',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-600/20',
    dot: 'bg-blue-500',
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    dot: 'bg-red-500',
  },
  RECEIVED: {
    label: 'Đã nhận hàng',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-600/20',
    dot: 'bg-teal-500',
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
    dot: 'bg-green-500',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    ring: 'ring-gray-600/20',
    dot: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
