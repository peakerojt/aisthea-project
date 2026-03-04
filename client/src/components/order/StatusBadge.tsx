import { OrderTrackingStatus, STATUS_COLOR_MAP, STATUS_LABEL } from '../../shared/orderTracking.constants';

export function StatusBadge({ status }: { status: string }) {
  const normStatus = (status || '').toUpperCase() as OrderTrackingStatus;
  const label = STATUS_LABEL[normStatus] || status || 'UNKNOWN';
  const colors = STATUS_COLOR_MAP[normStatus] || 'bg-slate-100 text-slate-700';

  return (
    <span
      aria-label={`order-status-${status}`}
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors}`}
    >
      {label}
    </span>
  );
}
