import { useEffect, useRef, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { Download, ExternalLink, Upload } from "lucide-react";

import { Page, PageHeader, Stack } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Group, Panel, Row, Rows } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { LoadingPane } from "@/components/ui/skeleton";
import { SliderRow } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { downloadStyleFile, readStyleFile } from "@/lib/style-file";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import { useAuthStore } from "@/stores/authStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AlertKind } from "@/types/alert";

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);

  if (!settings) return <LoadingPane label="Loading settings" />;

  return (
    <Page width="narrow">
      <PageHeader title="Settings" lede="Everything here saves as you leave the field." />
      <SaveAnnouncer />

      <Stack>
        <TwitchSection />
        <PlaybackSection />
        <StylesSection />
        <UpdatesSection />
        <AdvancedSection />
      </Stack>
    </Page>
  );
}

function TwitchSection() {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [clientId, setClientId] = useState(settings?.clientId ?? "");

  useEffect(() => {
    if (settings) setClientId(settings.clientId);
  }, [settings?.clientId]);

  const redirectUri = `http://localhost:${settings?.wsPort}/auth/callback`;

  return (
    <>
      <Group title="Twitch">
        <Rows>
          <Row label="Account" description={user ? `Signed in as @${user.login}` : "Not signed in."}>
            {user ? (
              <Button onClick={logout}>Sign out</Button>
            ) : (
              <Button variant="primary" onClick={login} disabled={authStatus === "loading"}>
                Connect Twitch
              </Button>
            )}
          </Row>

          <Row label="Client ID" description="From your own Twitch application." wide>
            <Input
              mono
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onBlur={() => update({ clientId: clientId.trim() })}
              placeholder="Client ID"
            />
          </Row>
        </Rows>
      </Group>

      <Group title="Setting up the Twitch application" description="Three steps, once.">
        <Panel className="p-4">
          <ol className="flex flex-col gap-3.5">
            <Step n={1}>
              Register an application at{" "}
              <a
                href="https://dev.twitch.tv/console/apps"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-xs text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
              >
                dev.twitch.tv/console/apps
                <ExternalLink className="size-3" />
              </a>{" "}
              with OAuth Client Type "Public".
            </Step>
            <Step n={2}>
              <span className="flex flex-wrap items-center gap-1.5">
                Set the redirect URI to exactly
                <code className="num rounded-sm bg-fill px-1.5 py-0.5 text-sm text-ink">{redirectUri}</code>
                <CopyButton value={redirectUri} />
              </span>
              <span className="mt-1 block text-ink-3">Twitch rejects 127.0.0.1 - it has to be localhost.</span>
            </Step>
            <Step n={3}>Paste the application's Client ID into the field above.</Step>
          </ol>
        </Panel>
      </Group>
    </>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-body text-ink-2">
      <span className="num mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-fill text-xs text-ink-2">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function PlaybackSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  if (!settings) return null;

  return (
    <Group title="Playback">
      <Rows>
        <Row
          label="Gap between alerts"
          description="Breathing room before the next queued alert, so a raid doesn't machine-gun them."
          wide
        >
          <SliderRow
            value={settings.alertGapMs}
            onChange={(alertGapMs) => update({ alertGapMs })}
            min={0}
            max={5000}
            step={100}
            format={(v) => `${(v / 1000).toFixed(1)}s`}
          />
        </Row>

        <Row
          label="Master volume"
          description="Scales every alert on top of its own volume. Duration, sounds and images are set per alert."
          wide
        >
          <SliderRow
            value={settings.globalVolume}
            onChange={(globalVolume) => update({ globalVolume })}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </Row>
      </Rows>
    </Group>
  );
}

/** Backup and restore for a look, and the way to hand one to someone else. */
function StylesSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const styles = useAlertStyleStore((s) => s.styles);
  const updateStyle = useAlertStyleStore((s) => s.update);
  const input = useRef<HTMLInputElement>(null);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const incoming = await readStyleFile(file);
      for (const [kind, style] of Object.entries(incoming.styles ?? {})) {
        updateStyle(kind as AlertKind, style);
      }
      if (settings) {
        update({
          ...(incoming.nowPlaying && { nowPlaying: { ...settings.nowPlaying, ...incoming.nowPlaying } }),
          // The goal's clock belongs to this install, not to the file.
          ...(incoming.goal && {
            goal: { ...settings.goal, ...incoming.goal, startedAt: settings.goal.startedAt },
          }),
          ...(incoming.chat && { chat: { ...settings.chat, ...incoming.chat } }),
        });
      }
      toast.ok("Styles imported");
    } catch (err) {
      toast.error("That file is not a Hibiki style file", String(err));
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Group title="Styles" description="The five alerts and the three on-stream widgets, as one file.">
      <Rows>
        <Row label="Export" description="Writes them to your downloads folder.">
          <Button
            disabled={!settings || !styles}
            onClick={() => {
              if (!settings || !styles) return;
              downloadStyleFile({
                hibikiStyles: 1,
                styles,
                nowPlaying: settings.nowPlaying,
                goal: settings.goal,
                chat: settings.chat,
              });
            }}
          >
            <Download />
            Export
          </Button>
        </Row>
        <Row label="Import" description="Replaces the looks in the file. Everything else is left alone.">
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()}>
            <Upload />
            Import
          </Button>
        </Row>
      </Rows>
    </Group>
  );
}

/** Installing is always a button somebody pressed: it restarts the app, and a
 *  restart mid-stream is not ours to decide. */
function UpdatesSection() {
  const [version, setVersion] = useState("");
  const [update, setUpdate] = useState<Update | null>(null);
  const [busy, setBusy] = useState<"checking" | "installing" | null>(null);

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const look = async () => {
    setBusy("checking");
    try {
      const found = await check();
      setUpdate(found);
      if (!found) toast.ok("Hibiki is up to date");
    } catch (err) {
      toast.error("Could not check for updates", String(err));
    } finally {
      setBusy(null);
    }
  };

  const install = async () => {
    if (!update) return;
    setBusy("installing");
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (err) {
      toast.error("Could not install the update", String(err));
      setBusy(null);
    }
  };

  return (
    <Group title="Updates">
      <Rows>
        <Row
          label={update ? `Version ${version} - ${update.version} is out` : `Version ${version}`}
          description={
            update
              ? "Installs over this copy and restarts. Your settings, media and sign-in stay."
              : "Checked against the releases page when Hibiki starts."
          }
        >
          {update ? (
            <Button variant="primary" onClick={install} disabled={busy !== null}>
              <Download />
              {busy === "installing" ? "Installing..." : `Install ${update.version}`}
            </Button>
          ) : (
            <Button onClick={look} disabled={busy !== null}>
              {busy === "checking" ? "Checking..." : "Check for updates"}
            </Button>
          )}
        </Row>
      </Rows>
    </Group>
  );
}

function AdvancedSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const status = useServerStatusStore((s) => s.status);
  const [wsPort, setWsPort] = useState(String(settings?.wsPort ?? ""));
  const [portError, setPortError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setWsPort(String(settings.wsPort));
  }, [settings?.wsPort]);

  // An invalid port rolls back, but says why: a field that silently ignores
  // you reads as broken.
  const commitPort = () => {
    const port = Number(wsPort);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      setPortError(null);
      if (port !== settings?.wsPort) update({ wsPort: port });
      return;
    }
    setPortError("Must be a whole number between 1 and 65535.");
    setWsPort(String(settings?.wsPort ?? ""));
  };

  if (!settings) return null;

  return (
    <Group title="Advanced">
      <Rows>
        <Row
          label="Minimize to tray"
          description="Minimising hides the window instead of sending it to the taskbar. Alerts keep firing either way."
        >
          <Switch
            checked={settings.minimizeToTray}
            onCheckedChange={(minimizeToTray) => update({ minimizeToTray })}
          />
        </Row>

        <Row
          label="Hide from screen capture"
          description="Keeps this window out of OBS display capture, screen shares and the Game Bar. Turn it off to show Hibiki on stream - your Twitch account details are on screen here."
        >
          <Switch
            checked={settings.hideFromCapture}
            onCheckedChange={(hideFromCapture) => update({ hideFromCapture })}
          />
        </Row>

        <Row label="Local server port" description="Restart Hibiki for a new port to take effect.">
          <div className="flex flex-col items-end gap-1">
            <Input
              type="number"
              min={1}
              max={65535}
              mono
              invalid={Boolean(portError)}
              value={wsPort}
              onChange={(e) => setWsPort(e.target.value)}
              onBlur={commitPort}
              className="w-24"
            />
            {portError && <span className="text-sm text-danger">{portError}</span>}
          </div>
        </Row>

        <Row label="Overlay URL" description="The Browser Source address OBS points at.">
          <code className="num min-w-0 flex-1 truncate rounded-sm bg-fill px-1.5 py-0.5 text-sm text-ink-2">
            {status?.overlayUrl}
          </code>
          <CopyButton value={status?.overlayUrl ?? ""} />
        </Row>
      </Rows>
    </Group>
  );
}

/** Settings save on blur, and the save is announced rather than only shown. */
function SaveAnnouncer() {
  const saving = useSettingsStore((s) => s.saving);
  const wasSaving = useRef(false);

  useEffect(() => {
    const finished = wasSaving.current && !saving;
    wasSaving.current = saving;
    if (finished) toast.ok("Saved");
  }, [saving]);

  return (
    <span aria-live="polite" className="sr-only">
      {saving ? "Saving" : ""}
    </span>
  );
}
