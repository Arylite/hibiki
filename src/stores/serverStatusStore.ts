import { create } from "zustand";

import { settingsService } from "@/services/settingsService";
import type { ServerStatus } from "@/types/settings";

interface ServerStatusState {
  status: ServerStatus | null;
  eventsubConnected: boolean;
  refresh: () => Promise<void>;
  setEventsubConnected: (connected: boolean) => void;
}

export const useServerStatusStore = create<ServerStatusState>((set) => ({
  status: null,
  eventsubConnected: false,
  refresh: async () => {
    const status = await settingsService.getServerStatus();
    set({ status, eventsubConnected: status.eventsubConnected });
  },
  setEventsubConnected: (connected) => set({ eventsubConnected: connected }),
}));
