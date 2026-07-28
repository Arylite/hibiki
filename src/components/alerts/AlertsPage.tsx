import { useState } from "react";

import { AlertDetail } from "@/components/alerts/AlertDetail";
import { Badge } from "@/components/ui/badge";
import { LoadingPane } from "@/components/ui/skeleton";
import { ALERT_KINDS, ALERT_META } from "@/lib/alert-meta";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import type { AlertKind } from "@/types/alert";
import type { AlertStyles } from "@/types/settings";

export function AlertsPage() {
  const styles = useAlertStyleStore((s) => s.styles);
  const [selected, setSelected] = useState<AlertKind>("follow");

  if (!styles) return <LoadingPane label="Loading alerts" />;

  return (
    <div className="flex h-full">
      <AlertRail styles={styles} selected={selected} onSelect={setSelected} />
      {/* Its own container: the settings columns measure against this pane, not
          the shell, which the rail would skew. */}
      <div className="@container min-w-0 flex-1 overflow-y-auto">
        <AlertDetail kind={selected} style={styles[selected]} />
      </div>
    </div>
  );
}

/** Every event, its state, and whatever image the streamer chose for it. */
function AlertRail({
  styles,
  selected,
  onSelect,
}: {
  styles: AlertStyles;
  selected: AlertKind;
  onSelect: (kind: AlertKind) => void;
}) {
  const port = useServerStatusStore((s) => s.status?.wsPort);

  return (
    <div className="flex w-[232px] shrink-0 flex-col border-r border-line">
      <p className="label px-5 pt-5 pb-2.5 text-ink-3">Event types</p>

      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {ALERT_KINDS.map((kind) => {
          const style = styles[kind];
          const { label, icon: Icon } = ALERT_META[kind];
          const active = selected === kind;
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onSelect(kind)}
                aria-current={active}
                className={cn(
                  "flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-body transition-colors duration-100",
                  active
                    ? "border border-line bg-surface font-medium text-ink shadow-raise"
                    : "border border-transparent text-ink-2 hover:bg-fill hover:text-ink",
                )}
              >
                {style.image ? (
                  <img src={mediaUrl(style.image, port)} alt="" className="size-5 shrink-0 object-contain" />
                ) : (
                  <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-ink-3")} />
                )}
                <span className="flex-1 truncate text-left">{label}</span>
                <Badge tone={style.enabled ? "ok" : "idle"}>{style.enabled ? "On" : "Off"}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
