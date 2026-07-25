import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Play } from "lucide-react";

import { Page, PageHeader, Stack } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Group, Row, RowButton, Rows } from "@/components/ui/group";
import { PositionGrid } from "@/components/ui/position-grid";
import { LoadingPane } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ALERT_KINDS, ALERT_META } from "@/lib/alert-meta";
import { alertsService } from "@/services/alerts/alertsService";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AlertKind } from "@/types/alert";

/** One Browser Source per widget, so OBS can place and scale each on its own. */
const PARTS = [
  { name: "Everything", query: "" },
  { name: "Alerts", query: "?only=alerts" },
  { name: "Music", query: "?only=music" },
  { name: "Goal", query: "?only=goal" },
  { name: "Chat", query: "?only=chat" },
] as const;

export function OverlayPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const status = useServerStatusStore((s) => s.status);
  const [sending, setSending] = useState<AlertKind | null>(null);

  const overlayUrl = status?.overlayUrl ?? "";
  const previewUrl = status ? `http://127.0.0.1:${status.wsPort}/overlay` : null;

  const sendTest = async (kind: AlertKind) => {
    setSending(kind);
    try {
      await alertsService.sendTest(kind);
      toast.ok(`Test ${ALERT_META[kind].label.toLowerCase()} sent`);
    } catch (err) {
      toast.error("Could not send the test alert", String(err));
    } finally {
      setTimeout(() => setSending(null), 600);
    }
  };

  if (!settings) return <LoadingPane label="Loading overlay" />;

  return (
    <Page>
      <PageHeader
        title="Overlay"
        lede="Add the overlay URL as a Browser Source in OBS. The preview below is the real overlay, served by the local server, and it restyles as you change things."
      />

      <div className="grid grid-cols-1 gap-7 @[900px]:grid-cols-[minmax(0,1fr)_264px]">
        <Stack>
          <div>
            {/* Checkerboard, so a transparent overlay reads as transparent
                rather than as a black card. */}
            <div className="checkerboard aspect-video w-full overflow-hidden rounded-lg border border-line shadow-raise">
              {previewUrl && <iframe src={previewUrl} title="Overlay preview" className="size-full border-0" />}
            </div>
            <div className="mt-2 flex items-center gap-2 px-0.5">
              <span className="num text-sm text-ink-3">1920×1080 · served live</span>
              <div className="ml-auto flex items-center gap-1">
                <CopyButton value={overlayUrl} label="Copy URL" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openUrl(overlayUrl)}
                  disabled={!overlayUrl}
                  aria-label="Open the overlay in a browser"
                >
                  <ExternalLink />
                </Button>
              </div>
            </div>
          </div>

          <Group title="Browser sources" description="One address per widget, so OBS can place each on its own.">
            <Rows>
              {PARTS.map((part) => {
                const url = `${overlayUrl}${part.query}`;
                return (
                  <Row key={part.name} label={part.name}>
                    <code className="num min-w-0 flex-1 truncate rounded-sm bg-fill px-1.5 py-0.5 text-sm text-ink-2">
                      {url}
                    </code>
                    <CopyButton value={url} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openUrl(url)}
                      disabled={!overlayUrl}
                      aria-label={`Open the ${part.name} source`}
                    >
                      <ExternalLink />
                    </Button>
                  </Row>
                );
              })}
            </Rows>
          </Group>
        </Stack>

        <Stack>
          <Group title="Alert placement">
            <PositionGrid
              value={settings.alertPosition}
              onChange={(alertPosition) => update({ alertPosition })}
            />
            <p className="mt-2.5 px-0.5 text-sm text-ink-3">
              Everything else about alerts — image, sound, colours — lives in Alerts.
            </p>
          </Group>

          <Group title="Send a test">
            <Rows>
              {ALERT_KINDS.map((kind) => {
                const { label, icon: Icon } = ALERT_META[kind];
                const sent = sending === kind;
                return (
                  <RowButton key={kind} onClick={() => sendTest(kind)} disabled={sent} className="min-h-0 py-2">
                    <Icon className="size-4 shrink-0 text-ink-3" />
                    <span className="flex-1 text-body text-ink">{label}</span>
                    {sent ? (
                      <span className="text-sm text-accent">Sent</span>
                    ) : (
                      <Play className="size-3.5 text-ink-3" />
                    )}
                  </RowButton>
                );
              })}
            </Rows>
          </Group>
        </Stack>
      </div>
    </Page>
  );
}
