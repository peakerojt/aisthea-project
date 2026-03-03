import React from 'react';
import { ShoppingBag, Package, Truck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { TrackingTimelineItem } from '../../types/tracking';
import { StatusBadge } from './StatusBadge';
import { getStatusMeta, normalizeStatus } from '../../config/orderStatus.config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusHistoryItem {
  status: string;
  oldStatus?: string | null;
  statusLabel?: string;
  changedAt: string;
  changedBy?: number | null;
  note?: string | null;
}

interface OrderTimelineProps {
  history: StatusHistoryItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon resolver
// ─────────────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag, Package, Truck, CheckCircle2, XCircle, RotateCcw,
};

const StatusDotIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => {
  const Icon = ICON_MAP[iconName] ?? Package;
  return <Icon size={12} className={className} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatter
// ─────────────────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderTimeline component (FSM-driven, for admin/store order detail)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vertical audit-trail timeline for order status history.
 * Fully driven by the FSM config — no magic strings.
 * Displays note and changedBy when available.
 */
export const OrderTimeline: React.FC<OrderTimelineProps> = ({ history = [] }) => {
  if (history.length === 0) {
    return (
      <div className="px-5 pb-5 pt-2">
        <p className="text-sm text-white/40 italic">Chưa có lịch sử trạng thái.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-5 pt-2 space-y-4">
      {history.map((item, index) => {
        const normalizedStatus = normalizeStatus(item.status);
        const cfg = getStatusMeta(normalizedStatus);
        return (
          <div key={`${item.status}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${(cfg as any)?.bgClass ?? cfg?.badgeClass ?? 'bg-white/10'}`}>
                <StatusDotIcon iconName={cfg?.icon ?? 'Package'} className={cfg?.textClass ?? 'text-white/60'} />
              </div>
              {index < history.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${cfg.textClass ?? 'text-white/80'}`}>
                  {item.statusLabel ?? cfg.label ?? item.status}
                </span>
                <span className="text-[10px] text-white/30">{formatDateTime(item.changedAt)}</span>
              </div>
              {item.note && (
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{item.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TrackingTimeline component (for order tracking module)
// ─────────────────────────────────────────────────────────────────────────────

export function TrackingTimeline({ timeline }: { timeline: TrackingTimelineItem[] }) {
  if (!timeline.length) {
    return <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">No timeline yet.</div>;
  }

  return (
    <ol className="space-y-4" aria-label="order-timeline">
      {timeline.map((item, index) => (
        <li key={`${item.status}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <StatusBadge status={item.status} />
            <time className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</time>
          </div>
          {item.note ? <p className="mt-2 text-sm text-slate-600">{item.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
