import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";

import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";

// Called lazily, never at module scope: getCurrentWindow() reads Tauri
// internals that only exist inside the app webview, and this module ships in
// the same bundle as the OBS overlay route. Evaluating it in a plain browser
// threw before React could mount, which killed the overlay's WebSocket.
// Returns null outside the webview so a cosmetic maximise indicator cannot
// take the whole shell down with it.
const appWindow = () => {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
};

/**
 * Window chrome, carrying the three live facts. It used to repeat the page
 * title, which the page already prints at 26px; holding the connection state
 * instead means it is legible from every screen without being read.
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const status = useServerStatusStore((s) => s.status);
  const eventsubConnected = useServerStatusStore((s) => s.eventsubConnected);
  // Until settings load, the long-standing behaviour: minimising hides.
  const toTray = useSettingsStore((s) => s.settings?.minimizeToTray ?? true);

  useEffect(() => {
    const win = appWindow();
    if (!win) return;
    win.isMaximized().then(setIsMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const clients = status?.overlayClients ?? 0;

  return (
    <header
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center justify-between pl-5 select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-5" aria-live="polite">
        <Stat label="EventSub" tone={eventsubConnected ? "ok" : "warning"}>
          {eventsubConnected ? "Connected" : "Down"}
        </Stat>
        <Stat label="Overlay" tone={clients > 0 ? "ok" : "idle"}>
          {clients === 1 ? "1 source" : `${clients} sources`}
        </Stat>
        <Stat label="Port">{status?.wsPort ?? "—"}</Stat>
      </div>

      <div className="flex items-center">
        <WindowButton
          onClick={() => (toTray ? invoke("hide_to_tray") : appWindow()?.minimize())}
          label={toTray ? "Minimize to tray" : "Minimize"}
        >
          <Minus className="size-3.5" />
        </WindowButton>
        <WindowButton onClick={() => appWindow()?.toggleMaximize()} label={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? <Copy className="size-3" /> : <Square className="size-3" />}
        </WindowButton>
        <WindowButton onClick={() => appWindow()?.close()} label="Close" danger>
          <X className="size-3.5" />
        </WindowButton>
      </div>
    </header>
  );
}

function Stat({ label, tone, children }: { label: string; tone?: StatusTone; children: ReactNode }) {
  return (
    <span data-tauri-drag-region className="flex items-center gap-1.5 text-sm">
      {tone && <StatusDot tone={tone} />}
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-2">{children}</span>
    </span>
  );
}

function WindowButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center text-ink-2 transition-colors duration-100",
        danger ? "hover:bg-danger hover:text-canvas" : "hover:bg-fill hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
