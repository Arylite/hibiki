import { ALERT_META, describeAlert } from "@/lib/alert-meta";
import { formatClock, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AlertPayload } from "@/types/alert";

interface EventListProps {
  alerts: AlertPayload[];
  /** Ticking clock, so relative times stay honest while the page is open. */
  now: number;
  /** History wants the wall-clock time as well; the dashboard reads live and
   *  only needs "how long ago". */
  showClock?: boolean;
  className?: string;
}

/**
 * One event, one line, read left to right as a sentence: who, what, when. The
 * kind of the event is carried by its icon rather than a column of labels —
 * five shapes are quicker to scan than five words.
 */
export function EventList({ alerts, now, showClock, className }: EventListProps) {
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {alerts.map((alert) => {
        const { label, icon: Icon } = ALERT_META[alert.type];
        return (
          <li key={alert.id} className="flex items-center gap-3 px-3.5 py-2 transition-colors hover:bg-fill">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2"
              title={label}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">{label}</span>
            </span>

            {showClock && <time className="num w-11 shrink-0 text-sm text-ink-3">{formatClock(alert.createdAt)}</time>}

            <p className="min-w-0 flex-1 truncate text-body">
              <span className="font-medium text-ink">{alert.username}</span>{" "}
              <span className="text-ink-2">{describeAlert(alert)}</span>
              {alert.message && <span className="text-ink-3"> · “{alert.message}”</span>}
            </p>

            <span className="num shrink-0 text-sm text-ink-3">{formatRelative(alert.createdAt, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}
