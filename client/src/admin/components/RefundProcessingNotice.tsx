import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface RefundProcessingNoticeProps {
  message: string;
  gatewayMessage?: string | null;
  className?: string;
  compact?: boolean;
}

export const RefundProcessingNotice: React.FC<RefundProcessingNoticeProps> = ({
  message,
  gatewayMessage,
  className = '',
  compact = false,
}) => (
  <div className={`rounded-xl border border-amber-500/20 bg-amber-500/10 ${compact ? 'px-4 py-3' : 'p-3'} ${className}`.trim()}>
    <div className="flex items-center gap-3">
      <AlertTriangle size={15} className="shrink-0 text-amber-400" />
      <p className="text-[12px] text-amber-200">
        {message}
      </p>
    </div>
    {gatewayMessage && (
      <p className={`${compact ? 'mt-1' : 'pl-7'} text-[11px] leading-relaxed text-amber-100/80`}>
        {gatewayMessage}
      </p>
    )}
  </div>
);
