import { invoke } from "@tauri-apps/api/core";

import type { TwitchUser } from "@/types/twitch";

export const authService = {
  getStatus: () => invoke<TwitchUser | null>("get_auth_status"),
  login: () => invoke<TwitchUser>("start_login"),
  logout: () => invoke<void>("logout"),
};
