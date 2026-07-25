import { create } from "zustand";

import { alertsService } from "@/services/alerts/alertsService";
import type { AlertKind } from "@/types/alert";
import type { AlertStyle, AlertStyles } from "@/types/settings";

const PERSIST_DEBOUNCE_MS = 200;

interface AlertStyleState {
  styles: AlertStyles | null;
  load: () => Promise<void>;
  update: (kind: AlertKind, patch: Partial<AlertStyle>) => void;
}

const timers = new Map<AlertKind, ReturnType<typeof setTimeout>>();

export const useAlertStyleStore = create<AlertStyleState>((set, get) => ({
  styles: null,
  load: async () => set({ styles: await alertsService.getStyles() }),
  /** Optimistic: the UI (and the live overlay preview) move with the slider,
   *  the write lands once the user stops dragging. */
  update: (kind, patch) => {
    const current = get().styles;
    if (!current) return;
    const next = { ...current[kind], ...patch };
    set({ styles: { ...current, [kind]: next } });

    clearTimeout(timers.get(kind));
    timers.set(
      kind,
      setTimeout(() => {
        timers.delete(kind);
        alertsService.updateStyle(kind, next);
      }, PERSIST_DEBOUNCE_MS),
    );
  },
}));
