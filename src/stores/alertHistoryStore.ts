import { create } from "zustand";

import { alertsService } from "@/services/alerts/alertsService";
import type { AlertPayload } from "@/types/alert";

/** The dashboard only ever shows the top of the list; the history page asks
 *  for more when it opens. */
const DEFAULT_LIMIT = 100;

interface AlertHistoryState {
  alerts: AlertPayload[];
  load: (limit?: number) => Promise<void>;
  push: (alert: AlertPayload) => void;
  clear: () => Promise<void>;
}

export const useAlertHistoryStore = create<AlertHistoryState>((set) => ({
  alerts: [],
  load: async (limit = DEFAULT_LIMIT) => set({ alerts: await alertsService.getRecent(limit) }),
  push: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  clear: async () => {
    await alertsService.clearHistory();
    set({ alerts: [] });
  },
}));
