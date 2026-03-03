import React from 'react';
import {
  ShoppingBag, Package, Truck, CheckCircle2,
  XCircle, RotateCcw, MessageSquare, User,
} from 'lucide-react';
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
// OrderTimeline component
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
    <div className="px-5 pb-5 pt-2 space-y-0">
      {history.map((entry, idx) => {
        const canonical = normalizeStatus(entry.status) ?? entry.status;
        const meta = getStatusMeta(canonical);
        const isLast = idx === history.length - 1;

        return (
          <div key={`${entry.status}-${entry.changedAt}-${idx}`} className="flex gap-3 relative">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-[13px] top-8 w-0.5 h-8 rounded-full bg-white/[0.06]" />
            )}

            {/* Status icon circle */}
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all
                ${isLast
                  ? `${meta.badgeClass} shadow-lg ${meta.glowClass}`
                  : 'border-white/15 bg-white/[0.04]'
                }`}
            >
              <StatusDotIcon
                iconName={meta.icon}
                className={isLast ? meta.textClass : 'text-white/40'}
              />
            </div>

            {/* Content */}
            <div className="pb-8 flex-1 min-w-0">
              {/* Status label + badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-semibold leading-none ${isLast ? 'text-white' : 'text-white/60'}`}>
                  {meta.label}
                </p>
                {isLast && (
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-bold ${meta.badgeClass} ${meta.textClass}`}>
                    Hiện tại
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <p className="text-[11px] text-white/35 mt-1.5 font-mono">
                {formatDateTime(entry.changedAt)}
              </p>

              {/* Note (reason for cancellation / return / change) */}
              {entry.note && (
                <div className="mt-2 flex items-start gap-1.5">
                  <MessageSquare size={11} className="text-white/30 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/50 leading-relaxed italic">
                    {entry.note}
                  </p>
                </div>
              )}

              {/* Changed by admin ID (shown when available) */}
              {entry.changedBy && (
                <div className="mt-1 flex items-center gap-1.5">
                  <User size={10} className="text-white/20 shrink-0" />
                  <p className="text-[10px] text-white/30">Admin #{entry.changedBy}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
