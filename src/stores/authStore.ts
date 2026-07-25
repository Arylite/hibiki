import { create } from "zustand";

import { authService } from "@/services/twitch/authService";
import type { TwitchUser } from "@/types/twitch";

interface AuthState {
  user: TwitchUser | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  load: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: TwitchUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  error: null,
  setUser: (user) => set({ user }),
  load: async () => {
    set({ status: "loading" });
    try {
      const user = await authService.getStatus();
      set({ user, status: "ready" });
    } catch (err) {
      set({ status: "ready", error: String(err) });
    }
  },
  login: async () => {
    set({ status: "loading", error: null });
    try {
      const user = await authService.login();
      set({ user, status: "ready" });
    } catch (err) {
      set({ status: "ready", error: String(err) });
    }
  },
  logout: async () => {
    await authService.logout();
    set({ user: null });
  },
}));
