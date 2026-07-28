import {
  Bell,
  Bookmark,
  Gauge,
  History,
  Layers,
  MessageSquare,
  Music,
  Radio,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export type Tab =
  | "dashboard"
  | "history"
  | "alerts"
  | "overlay"
  | "music"
  | "goal"
  | "chat"
  | "presets"
  | "settings";

export interface NavEntry {
  id: Tab;
  label: string;
  icon: LucideIcon;
  /** Route path under the app shell. */
  path: string;
}

/** Three groups: what happened, what goes on stream, what runs the app. A new
 *  function joins a group rather than lengthening one list. */
export const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Monitor",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Gauge, path: "/" },
      { id: "history", label: "History", icon: History, path: "/history" },
    ],
  },
  {
    label: "Stream",
    items: [
      { id: "alerts", label: "Alerts", icon: Bell, path: "/alerts" },
      { id: "overlay", label: "Overlay", icon: Layers, path: "/overlay-setup" },
      { id: "music", label: "Music", icon: Music, path: "/music" },
      { id: "goal", label: "Goal", icon: Target, path: "/goal" },
      { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "presets", label: "Presets", icon: Bookmark, path: "/presets" },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

/** Not built yet, but it holds its slot so the nav's shape is honest. */
export const NAV_PLANNED: { label: string; icon: LucideIcon }[] = [{ label: "TTS", icon: Radio }];
