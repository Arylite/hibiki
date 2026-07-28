import { invoke } from "@tauri-apps/api/core";

import type { TwitchUser } from "@/types/twitch";

export const authService = {
  getStatus: () => invoke<TwitchUser | null>("get_auth_status"),
  getAccounts: () => invoke<TwitchUser[]>("get_accounts"),
  login: () => invoke<TwitchUser>("start_login"),
  switchTo: (userId: string) => invoke<TwitchUser>("switch_account", { userId }),
  /** Signs out of the active account; another may take over. */
  logout: () => invoke<TwitchUser | null>("logout"),
};
