import { z } from "zod";

export const NowPlayingSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  /** App model id of the player, e.g. "Spotify.exe". */
  source: z.string(),
  playing: z.boolean(),
  /** Cover art as a data URL - the overlay has no access to WinRT streams. */
  art: z.string().nullable(),
});
export type NowPlaying = z.infer<typeof NowPlayingSchema>;

export const WsNowPlayingMessageSchema = z.object({
  type: z.literal("nowPlaying"),
  payload: NowPlayingSchema.nullable(),
});

/** Turns an app model id into something a human recognises. */
export function sourceLabel(source: string): string {
  const head = source.split("!")[0] ?? source;
  const name = head.split("_")[0] ?? head;
  return name.replace(/\.exe$/i, "") || source;
}
