import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ChevronRight, ExternalLink, Play } from "lucide-react";

import { Page, PageHeader, Stack } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EventList } from "@/components/ui/event-list";
import { Group, Row, RowButton, Rows } from "@/components/ui/group";
import { Logo } from "@/components/ui/logo";
import { Segmented } from "@/components/ui/segmented";
import { LoadingPane } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { toast } from "@/components/ui/toast";
import { ALERT_KINDS, ALERT_META } from "@/lib/alert-meta";
import { CONNECTION_TONE, connectionState, type ConnectionState } from "@/lib/connection";
import { formatRelative } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { alertsService } from "@/services/alerts/alertsService";
import { useAlertHistoryStore } from "@/stores/alertHistoryStore";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import { useAuthStore } from "@/stores/authStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AlertKind } from "@/types/alert";

const RECENT = 8;
const KIND_OPTIONS = ALERT_KINDS.map((kind) => ({ value: kind, label: ALERT_META[kind].label }));

export function DashboardPage() {
  const settings = useSettingsStore((s) => s.settings);
  if (!settings) return <LoadingPane label="Loading dashboard" />;
  return <Dashboard />;
}

function Dashboard() {
  const navigate = useNavigate();
  const now = useNow(30000);

  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const authError = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);

  const settings = useSettingsStore((s) => s.settings)!;
  const styles = useAlertStyleStore((s) => s.styles);
  const status = useServerStatusStore((s) => s.status);
  const eventsubConnected = useServerStatusStore((s) => s.eventsubConnected);
  const alerts = useAlertHistoryStore((s) => s.alerts);

  const [kind, setKind] = useState<AlertKind>("follow");
  const [testing, setTesting] = useState(false);

  // Auth failures used to be a red line beside the button. They are loud now.
  useEffect(() => {
    if (authError) toast.error("Twitch sign-in failed", authError);
  }, [authError]);

  const overlayUrl = status?.overlayUrl ?? "";
  const overlayClients = status?.overlayClients ?? 0;
  const state = connectionState({
    clientId: settings.clientId,
    signedIn: Boolean(user),
    eventsubConnected,
    overlayClients,
  });

  const enabledAlerts = ALERT_KINDS.filter((k) => styles?.[k].enabled);
  const goal = settings.goal;
  const lastAlert = alerts[0];

  const headline = headlines(
    lastAlert
      ? `Events are arriving — the last one landed ${formatRelative(lastAlert.createdAt, now)}.`
      : "Nothing has come in yet. Send a test alert to check the wiring.",
  )[state];

  const sendTest = async () => {
    setTesting(true);
    try {
      await alertsService.sendTest(kind);
      toast.ok(`Test ${ALERT_META[kind].label.toLowerCase()} sent`);
    } catch (err) {
      toast.error("Could not send the test alert", String(err));
    } finally {
      setTimeout(() => setTesting(false), 600);
    }
  };

  return (
    <Page>
      <PageHeader
        title={headline.title}
        lede={
          <span className="flex items-start gap-2.5">
            <StatusDot tone={CONNECTION_TONE[state]} className="mt-[9px]" />
            <span>{headline.detail}</span>
          </span>
        }
        actions={
          <>
            {state === "unconfigured" && (
              <Button variant="primary" size="lg" onClick={() => navigate("/settings")}>
                Open settings
              </Button>
            )}
            {state === "signed-out" && (
              <Button variant="primary" size="lg" onClick={login} disabled={authStatus === "loading"}>
                {authStatus === "loading" ? "Waiting for Twitch…" : "Connect Twitch"}
              </Button>
            )}
            {state === "no-overlay" && (
              <CopyButton value={overlayUrl} label="Copy overlay URL" variant="secondary" size="md" />
            )}
          </>
        }
        aside={<Logo size={56} className="hidden @[860px]:block" />}
      />

      <Stack>
        <div className="grid grid-cols-1 gap-7 @[860px]:grid-cols-2">
          <Group title="System">
            <Rows>
              <Row label="Twitch">
                <StatusDot tone={user ? "ok" : "idle"} />
                <span className="truncate text-body text-ink-2">{user ? `@${user.login}` : "Not signed in"}</span>
              </Row>
              <Row label="Overlay">
                <StatusDot tone={overlayClients > 0 ? "ok" : "idle"} />
                <span className="truncate text-body text-ink-2">
                  {overlayClients > 0
                    ? `${overlayClients} browser source${overlayClients === 1 ? "" : "s"}`
                    : "No browser source"}
                </span>
              </Row>
              <Row label="Events">
                <StatusDot tone={enabledAlerts.length > 0 ? "ok" : "idle"} />
                <span className="truncate text-body text-ink-2">
                  {enabledAlerts.length > 0
                    ? enabledAlerts.map((k) => ALERT_META[k].label).join(", ")
                    : "All alerts are off"}
                </span>
              </Row>
            </Rows>
          </Group>

          <Group title="Widgets">
            <Rows>
              <RowButton onClick={() => navigate("/alerts")}>
                <span className="w-16 shrink-0 text-body text-ink">Alerts</span>
                <span className="min-w-0 flex-1 truncate text-body text-ink-3">
                  {enabledAlerts.length} of {ALERT_KINDS.length} on
                </span>
                <Badge tone={enabledAlerts.length > 0 ? "ok" : "idle"}>
                  {enabledAlerts.length > 0 ? "On" : "Off"}
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-ink-3" />
              </RowButton>

              <RowButton onClick={() => navigate("/music")}>
                <span className="w-16 shrink-0 text-body text-ink">Music</span>
                <span className="min-w-0 flex-1 truncate text-body text-ink-3">
                  {settings.nowPlaying.showArt ? "Cover art" : "Equaliser"}
                </span>
                <Badge tone={settings.nowPlaying.enabled ? "ok" : "idle"}>
                  {settings.nowPlaying.enabled ? "On" : "Off"}
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-ink-3" />
              </RowButton>

              <RowButton onClick={() => navigate("/goal")}>
                <span className="w-16 shrink-0 text-body text-ink">Goal</span>
                <span className="min-w-0 flex-1 truncate text-body text-ink-3">
                  <span className="num">{goal.target}</span> {goal.kind}
                </span>
                <Badge tone={goal.enabled ? "ok" : "idle"}>{goal.enabled ? "On" : "Off"}</Badge>
                <ChevronRight className="size-4 shrink-0 text-ink-3" />
              </RowButton>
            </Rows>
          </Group>
        </div>

        <Group title="Quick actions">
          <Rows>
            <Row label="Overlay URL" description="The Browser Source address OBS points at.">
              <CopyButton value={overlayUrl} label="Copy" variant="secondary" size="md" />
              <Button variant="ghost" onClick={() => openUrl(overlayUrl)} disabled={!overlayUrl}>
                <ExternalLink />
                Open
              </Button>
            </Row>
            {/* The test used to be hardwired to a follow, which left the other
                four kinds untestable from here. */}
            <Row label="Test alert" description="Fires a sample event through the real overlay.">
              <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
              <Button variant="secondary" onClick={sendTest} disabled={testing}>
                <Play />
                {testing ? "Sent" : "Send"}
              </Button>
            </Row>
          </Rows>
        </Group>

        <Group
          title="Recent activity"
          action={
            <Link to="/history" className="rounded-sm text-sm text-ink-3 transition-colors hover:text-ink">
              View all
            </Link>
          }
        >
          <Rows>
            {alerts.length === 0 ? (
              <EmptyState
                title="Nothing yet"
                description="Events show up here the moment they reach Hibiki, whether or not your overlay showed them."
              />
            ) : (
              <EventList alerts={alerts.slice(0, RECENT)} now={now} />
            )}
          </Rows>
        </Group>
      </Stack>
    </Page>
  );
}

/** The one question the dashboard answers, in the five states it can be in. */
const headlines = (listening: string): Record<ConnectionState, { title: string; detail: string }> => ({
  unconfigured: {
    title: "Twitch app not set up",
    detail: "Hibiki signs in through your own Twitch application. Add its Client ID to get started.",
  },
  "signed-out": {
    title: "Not connected to Twitch",
    detail: "Sign in with the broadcaster account you want to receive events for.",
  },
  connecting: {
    title: "Connecting to Twitch",
    detail: "Signed in. Waiting for the EventSub connection to come up.",
  },
  "no-overlay": {
    title: "No overlay connected",
    detail: "Events are arriving, but nothing is rendering them. Add the overlay URL as a Browser Source in OBS.",
  },
  running: { title: "Everything is running", detail: listening },
});
