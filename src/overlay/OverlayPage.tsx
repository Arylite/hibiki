import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { OverlaySocket } from "@/services/websocket/overlaySocket";
import type { AlertPayload } from "@/types/alert";
import type { ChatMessage } from "@/types/chat";
import type { NowPlaying } from "@/types/nowplaying";
import type { AlertPosition, GoalState, OverlayConfig } from "@/types/settings";
import { AlertCard } from "./AlertCard";
import { ChatBox } from "./ChatBox";
import { fetchOverlayConfig } from "./config";
import { GoalBar } from "./GoalBar";
import { NowPlayingWidget } from "./NowPlayingWidget";
import { playAlertSound } from "./sound";

/** Chat is the only widget that keeps a list, so it is the only one that
 *  needs a cap: OBS browser sources run for a whole broadcast. */
const CHAT_BUFFER = 50;

const POSITION_CLASSES: Record<AlertPosition, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  "center-left": "items-center justify-start",
  center: "items-center justify-center",
  "center-right": "items-center justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};

const CONFIG_RETRY_MS = 2000;

/** `?only=alerts|music|goal|chat` lets OBS hold each widget as its own Browser
 *  Source, so they can be moved and scaled independently on the scene. */
function only(): string | null {
  return new URLSearchParams(window.location.search).get("only");
}

/** Everything shows unless a specific widget was asked for. */
const wants = (show: string | null, widget: string) => show === null || show === widget;

export function OverlayPage() {
  const [config, setConfig] = useState<OverlayConfig | null>(null);
  const [queue, setQueue] = useState<AlertPayload[]>([]);
  const [current, setCurrent] = useState<AlertPayload | null>(null);
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [goal, setGoal] = useState<GoalState>({ current: 0, target: 0 });
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const configRef = useRef<OverlayConfig | null>(null);
  /** When the last alert left the screen, so the gap is measured from it. */
  const lastEndedAt = useRef(0);

  const show = only();
  const showAlerts = wants(show, "alerts");
  const showMusic = wants(show, "music");
  const showGoal = wants(show, "goal");
  const showChat = wants(show, "chat");

  const applyConfig = (next: OverlayConfig) => {
    configRef.current = next;
    setConfig(next);
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const loaded = await fetchOverlayConfig();
      if (cancelled) return;
      if (loaded) applyConfig(loaded);
      else timer = setTimeout(load, CONFIG_RETRY_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new OverlaySocket(`${protocol}://${window.location.host}/ws`);
    const unsubscribeAlert = socket.onAlert((alert) => setQueue((q) => [...q, alert]));
    // Edits in the app arrive here, so OBS restyles without a refresh.
    const unsubscribeConfig = socket.onConfig(applyConfig);
    const unsubscribeTrack = socket.onNowPlaying(setTrack);
    const unsubscribeGoal = socket.onGoal(setGoal);
    const unsubscribeChat = socket.onChat((message) =>
      setChat((current) => [...current, message].slice(-CHAT_BUFFER)),
    );
    socket.connect();
    return () => {
      unsubscribeAlert();
      unsubscribeConfig();
      unsubscribeTrack();
      unsubscribeGoal();
      unsubscribeChat();
      socket.close();
    };
  }, []);

  // Alerts get breathing room between them: a raid full of gifted subs would
  // otherwise machine-gun cards with no readable break.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const gap = configRef.current?.alertGapMs ?? 0;
    const wait = Math.max(0, lastEndedAt.current + gap - Date.now());
    const timer = setTimeout(() => {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }, wait);
    return () => clearTimeout(timer);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const cfg = configRef.current;
    const style = cfg?.styles[current.type];
    playAlertSound(current.type, style?.sound ?? null, (style?.volume ?? 0.8) * (cfg?.globalVolume ?? 1));
    const timer = setTimeout(() => {
      lastEndedAt.current = Date.now();
      setCurrent(null);
    }, style?.durationMs ?? 6000);
    return () => clearTimeout(timer);
  }, [current]);

  if (!config) return null;

  return (
    <div
      className={`relative flex h-screen w-screen overflow-hidden bg-transparent ${POSITION_CLASSES[config.alertPosition]}`}
      style={{ padding: config.overlayPadding }}
    >
      {showAlerts && (
        <AnimatePresence mode="wait">
          {current && <AlertCard key={current.id} alert={current} style={config.styles[current.type]} />}
        </AnimatePresence>
      )}

      {showMusic && <NowPlayingWidget track={track} config={config.nowPlaying} pad={config.overlayPadding} />}
      {showGoal && <GoalBar config={config.goal} state={goal} pad={config.overlayPadding} />}
      {showChat && <ChatBox messages={chat} config={config.chat} pad={config.overlayPadding} />}
    </div>
  );
}
