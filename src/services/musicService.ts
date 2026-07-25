import { invoke } from "@tauri-apps/api/core";

import type { NowPlaying } from "@/types/nowplaying";

export type MediaAction = "playpause" | "next" | "previous";

export const musicService = {
  get: () => invoke<NowPlaying | null>("get_now_playing"),
  control: (action: MediaAction) => invoke<boolean>("media_command", { action }),
};
