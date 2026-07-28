import type { StatusTone } from "@/components/ui/status-dot";

/** Ordered by what blocks what: no events without an account, and events with
 *  nowhere to render are still a problem. */
export type ConnectionState = "unconfigured" | "signed-out" | "connecting" | "no-overlay" | "running";

export function connectionState(input: {
  clientId: string;
  signedIn: boolean;
  eventsubConnected: boolean;
  overlayClients: number;
}): ConnectionState {
  if (!input.clientId.trim()) return "unconfigured";
  if (!input.signedIn) return "signed-out";
  if (!input.eventsubConnected) return "connecting";
  if (input.overlayClients === 0) return "no-overlay";
  return "running";
}

export const CONNECTION_TONE: Record<ConnectionState, StatusTone> = {
  unconfigured: "warning",
  "signed-out": "idle",
  connecting: "warning",
  "no-overlay": "warning",
  running: "ok",
};

/** Sidebar-sized wording. The dashboard says it in full sentences. */
export const CONNECTION_LABEL: Record<ConnectionState, string> = {
  unconfigured: "Setup needed",
  "signed-out": "Not connected",
  connecting: "Connecting",
  "no-overlay": "Overlay offline",
  running: "Listening",
};
