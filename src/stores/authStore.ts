import { create } from "zustand";

import { authService } from "@/services/twitch/authService";
import type { TwitchUser } from "@/types/twitch";

interface AuthState {
  /** The account the app is acting as. */
  user: TwitchUser | null;
  /** Every signed-in account, the active one first. */
  accounts: TwitchUser[];
  status: "idle" | "loading" | "ready";
  error: string | null;
  load: () => Promise<void>;
  login: () => Promise<void>;
  switchTo: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: TwitchUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accounts: [],
  status: "idle",
  error: null,
  setUser: (user) => set({ user }),
  load: async () => {
    set({ status: "loading" });
    try {
      const [user, accounts] = await Promise.all([authService.getStatus(), authService.getAccounts()]);
      set({ user, accounts, status: "ready" });
    } catch (err) {
      set({ status: "ready", error: String(err) });
    }
  },
  login: async () => {
    set({ status: "loading", error: null });
    try {
      const user = await authService.login();
      set({ user, accounts: await authService.getAccounts(), status: "ready" });
    } catch (err) {
      set({ status: "ready", error: String(err) });
    }
  },
  switchTo: async (userId) => {
    if (get().user?.userId === userId) return;
    set({ status: "loading", error: null });
    try {
      const user = await authService.switchTo(userId);
      set({ user, accounts: await authService.getAccounts(), status: "ready" });
    } catch (err) {
      set({ status: "ready", error: String(err) });
    }
  },
  logout: async () => {
    const user = await authService.logout();
    set({ user, accounts: await authService.getAccounts() });
  },
}));
