import { WsAlertMessageSchema, type AlertPayload } from "@/types/alert";
import { WsChatMessageSchema, type ChatMessage } from "@/types/chat";
import { WsNowPlayingMessageSchema, type NowPlaying } from "@/types/nowplaying";
import {
  WsConfigMessageSchema,
  WsGoalMessageSchema,
  type GoalState,
  type OverlayConfig,
} from "@/types/settings";

type AlertListener = (alert: AlertPayload) => void;
type ConfigListener = (config: OverlayConfig) => void;
type TrackListener = (track: NowPlaying | null) => void;
type GoalListener = (goal: GoalState) => void;
type ChatListener = (message: ChatMessage) => void;
type StatusListener = (connected: boolean) => void;

const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 15000;

/**
 * Reconnecting WebSocket client for the OBS overlay page. The overlay is
 * loaded by OBS as a plain browser source (no Tauri context), so this talks
 * to the local server's `/ws` endpoint directly. It carries two kinds of
 * message: alerts to play, and config pushes so edits land without a refresh.
 */
export class OverlaySocket {
  private ws: WebSocket | null = null;
  private alertListeners = new Set<AlertListener>();
  private configListeners = new Set<ConfigListener>();
  private trackListeners = new Set<TrackListener>();
  private goalListeners = new Set<GoalListener>();
  private chatListeners = new Set<ChatListener>();
  private statusListeners = new Set<StatusListener>();
  private retryDelay = INITIAL_RETRY_MS;
  private closedByUser = false;

  constructor(private readonly url: string) {}

  connect(): void {
    this.closedByUser = false;
    const socket = new WebSocket(this.url);
    this.ws = socket;

    socket.onopen = () => {
      this.retryDelay = INITIAL_RETRY_MS;
      this.statusListeners.forEach((cb) => cb(true));
    };

    socket.onmessage = (event) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data as string);
      } catch {
        return;
      }
      const alert = WsAlertMessageSchema.safeParse(raw);
      if (alert.success) {
        this.alertListeners.forEach((cb) => cb(alert.data.payload));
        return;
      }
      const config = WsConfigMessageSchema.safeParse(raw);
      if (config.success) {
        this.configListeners.forEach((cb) => cb(config.data.payload));
        return;
      }
      const track = WsNowPlayingMessageSchema.safeParse(raw);
      if (track.success) {
        this.trackListeners.forEach((cb) => cb(track.data.payload));
        return;
      }
      const goal = WsGoalMessageSchema.safeParse(raw);
      if (goal.success) {
        this.goalListeners.forEach((cb) => cb(goal.data.payload));
        return;
      }
      const chat = WsChatMessageSchema.safeParse(raw);
      if (chat.success) {
        this.chatListeners.forEach((cb) => cb(chat.data.payload));
      }
    };

    socket.onclose = () => {
      this.statusListeners.forEach((cb) => cb(false));
      if (!this.closedByUser) {
        setTimeout(() => this.connect(), this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
      }
    };

    socket.onerror = () => socket.close();
  }

  onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  onConfig(listener: ConfigListener): () => void {
    this.configListeners.add(listener);
    return () => this.configListeners.delete(listener);
  }

  onNowPlaying(listener: TrackListener): () => void {
    this.trackListeners.add(listener);
    return () => this.trackListeners.delete(listener);
  }

  onGoal(listener: GoalListener): () => void {
    this.goalListeners.add(listener);
    return () => this.goalListeners.delete(listener);
  }

  onChat(listener: ChatListener): () => void {
    this.chatListeners.add(listener);
    return () => this.chatListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
  }
}
