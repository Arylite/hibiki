import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import { Outlet } from "react-router-dom";

import { BootSplash } from "@/components/layout/BootSplash";
import { Sidebar } from "@/components/layout/Sidebar";
import { TitleBar } from "@/components/layout/TitleBar";
import { toast, Toaster } from "@/components/ui/toast";
import { useAlertHistoryStore } from "@/stores/alertHistoryStore";
import { useAlertStyleStore } from "@/stores/alertStyleStore";
import { useChatStore } from "@/stores/chatStore";
import { useNowPlayingStore } from "@/stores/nowPlayingStore";
import { useAuthStore } from "@/stores/authStore";
import { useServerStatusStore } from "@/stores/serverStatusStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AlertPayload } from "@/types/alert";
import type { ChatMessage } from "@/types/chat";
import type { NowPlaying } from "@/types/nowplaying";
import type { TwitchUser } from "@/types/twitch";

const STATUS_POLL_MS = 5000;

export function AppShell() {
  const loadAuth = useAuthStore((s) => s.load);
  const setUser = useAuthStore((s) => s.setUser);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadAlertStyles = useAlertStyleStore((s) => s.load);
  const loadHistory = useAlertHistoryStore((s) => s.load);
  const pushAlert = useAlertHistoryStore((s) => s.push);
  const refreshStatus = useServerStatusStore((s) => s.refresh);
  const setEventsubConnected = useServerStatusStore((s) => s.setEventsubConnected);
  const loadNowPlaying = useNowPlayingStore((s) => s.load);
  const setNowPlaying = useNowPlayingStore((s) => s.set);
  const pushChat = useChatStore((s) => s.push);

  useEffect(() => {
    loadAuth();
    loadSettings();
    loadAlertStyles();
    loadHistory();
    refreshStatus();
    loadNowPlaying();

    // Once, quietly, and never installed behind anyone's back: a newer release
    // is worth a line, and being offline is not worth an error while someone
    // is going live.
    check()
      .then((update) => {
        if (update) toast.ok(`Hibiki ${update.version} is out`, "Settings → Updates installs it.");
      })
      .catch(() => {});

    const unlisten: Array<() => void> = [];
    listen<TwitchUser | null>("auth-changed", (e) => setUser(e.payload)).then((fn) => unlisten.push(fn));
    listen<AlertPayload>("alert", (e) => pushAlert(e.payload)).then((fn) => unlisten.push(fn));
    listen<boolean>("eventsub-status", (e) => setEventsubConnected(e.payload)).then((fn) => unlisten.push(fn));
    listen<NowPlaying | null>("now-playing", (e) => setNowPlaying(e.payload)).then((fn) => unlisten.push(fn));
    // Chat lands in the window whichever page is open, so opening Chat mid
    // conversation shows what was said rather than starting from silence.
    listen<ChatMessage>("chat", (e) => pushChat(e.payload)).then((fn) => unlisten.push(fn));

    const interval = setInterval(refreshStatus, STATUS_POLL_MS);
    return () => {
      unlisten.forEach((fn) => fn());
      clearInterval(interval);
    };
  }, [
    loadAuth,
    loadSettings,
    loadAlertStyles,
    loadHistory,
    pushAlert,
    pushChat,
    refreshStatus,
    setEventsubConnected,
    setUser,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink">
      <BootSplash />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TitleBar />
        {/* Every page's responsive maths is measured here, not on the viewport,
            because the sidebar takes a fixed slice of it. */}
        <main className="@container relative min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}

