import { invoke } from "@tauri-apps/api/core";

import type { Settings, ServerStatus } from "@/types/settings";

export const settingsService = {
  get: () => invoke<Settings>("get_settings"),
  update: (settings: Settings) => invoke<Settings>("update_settings", { settings }),
  getServerStatus: () => invoke<ServerStatus>("get_server_status"),
  resetGoal: () => invoke<Settings>("reset_goal"),
};
