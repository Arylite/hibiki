import { create } from "zustand";

import { musicService, type MediaAction } from "@/services/musicService";
import type { NowPlaying } from "@/types/nowplaying";

/** Players need a beat to report the new state; the 2s poller would be a long
 *  wait for a button you just pressed. */
const CONTROL_SETTLE_MS = 350;

interface NowPlayingState {
  track: NowPlaying | null;
  load: () => Promise<void>;
  set: (track: NowPlaying | null) => void;
  control: (action: MediaAction) => Promise<void>;
}

export const useNowPlayingStore = create<NowPlayingState>((set, get) => ({
  track: null,
  load: async () => set({ track: await musicService.get() }),
  set: (track) => set({ track }),
  control: async (action) => {
    await musicService.control(action);
    setTimeout(() => get().load(), CONTROL_SETTLE_MS);
  },
}));
