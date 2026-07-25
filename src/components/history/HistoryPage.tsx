import { useEffect, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";

import { Page, PageHeader } from "@/components/layout/Page";
import { BadgeButton } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EventList } from "@/components/ui/event-list";
import { Rows } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ALERT_KINDS, ALERT_META, describeAlert } from "@/lib/alert-meta";
import { useNow } from "@/lib/use-now";
import { useAlertHistoryStore } from "@/stores/alertHistoryStore";
import type { AlertKind } from "@/types/alert";

const HISTORY_LIMIT = 500;

export function HistoryPage() {
  const alerts = useAlertHistoryStore((s) => s.alerts);
  const load = useAlertHistoryStore((s) => s.load);
  const clear = useAlertHistoryStore((s) => s.clear);
  const now = useNow(30000);

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<AlertKind>>(new Set());

  // The dashboard keeps a short list; opening the page pulls the full log.
  useEffect(() => {
    load(HISTORY_LIMIT);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (kinds.size > 0 && !kinds.has(alert.type)) return false;
      if (!needle) return true;
      return `${alert.username} ${describeAlert(alert)} ${alert.message ?? ""}`.toLowerCase().includes(needle);
    });
  }, [alerts, kinds, query]);

  const toggleKind = (kind: AlertKind) =>
    setKinds((current) => {
      const next = new Set(current);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });

  const clearAll = async () => {
    await clear();
    toast.ok("History cleared");
  };

  return (
    <Page>
      <PageHeader
        title="History"
        lede="Every event Hibiki received, including the ones your overlay never showed."
      />

      {/* Sticky, because filtering a log you have scrolled into is the whole
          point of having filters. */}
      <div className="sticky top-0 z-10 -mx-8 mb-5 border-b border-line bg-canvas px-8 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a name or a message"
              className="pl-8"
              aria-label="Search the history"
            />
          </div>

          <div role="group" aria-label="Filter by event type" className="flex flex-wrap items-center gap-1">
            {ALERT_KINDS.map((kind) => (
              <BadgeButton key={kind} onClick={() => toggleKind(kind)} pressed={kinds.has(kind)}>
                {ALERT_META[kind].label}
              </BadgeButton>
            ))}
          </div>

          <div className="ml-auto">
            {/* Irreversible, and it used to fire on a single click. */}
            <ConfirmDialog
              trigger={
                <Button variant="danger" disabled={alerts.length === 0}>
                  <Trash2 />
                  Clear
                </Button>
              }
              title="Clear the history?"
              description={`All ${alerts.length} recorded events are deleted. This cannot be undone.`}
              confirmLabel="Clear history"
              onConfirm={clearAll}
            />
          </div>
        </div>
      </div>

      <Rows>
        {filtered.length === 0 ? (
          alerts.length === 0 ? (
            <EmptyState
              title="No events recorded yet"
              description="Follows, subs, raids and cheers are logged here as they arrive — even the ones your overlay never showed."
            />
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              description="Clear the search or the type filters to see the full log again."
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setKinds(new Set());
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          )
        ) : (
          <EventList alerts={filtered} now={now} showClock />
        )}
      </Rows>

      <p className="num mt-3 px-0.5 text-sm text-ink-3">
        {filtered.length} of {alerts.length} events · last {HISTORY_LIMIT} kept
      </p>
    </Page>
  );
}
