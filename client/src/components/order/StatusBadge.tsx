import { OrderTrackingStatus, STATUS_COLOR_MAP, STATUS_LABEL } from '../../shared/orderTracking.constants';

export function StatusBadge({ status }: { status: OrderTrackingStatus }) {
  return (
    <span
      aria-label={`order-status-${status}`}
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR_MAP[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
