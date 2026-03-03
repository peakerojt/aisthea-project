import { TrackingTimelineItem } from '../../types/tracking';
import { StatusBadge } from './StatusBadge';

export function OrderTimeline({ timeline }: { timeline: TrackingTimelineItem[] }) {
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
