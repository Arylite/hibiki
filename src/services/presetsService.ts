import { invoke } from "@tauri-apps/api/core";

import type { Settings } from "@/types/settings";

export interface PresetSummary {
  name: string;
  savedAt: number;
}

export const presetsService = {
  list: () => invoke<PresetSummary[]>("get_presets"),
  save: (name: string) => invoke<void>("save_preset", { name }),
  apply: (name: string) => invoke<Settings>("apply_preset", { name }),
  remove: (name: string) => invoke<void>("delete_preset", { name }),
};
