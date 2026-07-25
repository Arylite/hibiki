import { create } from "zustand";

import { settingsService } from "@/services/settingsService";
import type { Settings } from "@/types/settings";

/** Sliders and colour pickers fire continuously; the UI follows every frame,
 *  sqlite hears about it once the hand stops. */
const PERSIST_DEBOUNCE_MS = 200;

interface SettingsState {
  settings: Settings | null;
  saving: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  saving: false,
  load: async () => {
    const settings = await settingsService.get();
    set({ settings });
  },
  update: (patch) => {
    const current = get().settings;
    if (!current) return;
    const next = { ...current, ...patch };
    set({ settings: next, saving: true });

    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await settingsService.update(next);
      } finally {
        set({ saving: false });
      }
    }, PERSIST_DEBOUNCE_MS);
  },
}));
