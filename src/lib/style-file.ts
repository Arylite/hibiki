import { z } from "zod";

import { fromBase64, mediaUrl, toBase64 } from "@/lib/media";
import { alertsService } from "@/services/alerts/alertsService";
import { AlertKindSchema } from "@/types/alert";
import {
  AlertStyleSchema,
  ChatWidgetSchema,
  GoalWidgetSchema,
  NowPlayingWidgetSchema,
} from "@/types/settings";

/** A whole look in one file: the alerts and the three on-stream widgets. Every
 *  field is optional and merged onto what is there, so a file written by
 *  another version is worth reading rather than rejecting. */
export const StyleFileSchema = z.object({
  hibikiStyles: z.literal(1),
  // Partial, not `record`: a record keyed by an enum demands every alert, and
  // a file carrying two of them is still worth reading.
  styles: z.partialRecord(AlertKindSchema, AlertStyleSchema.partial()).optional(),
  nowPlaying: NowPlayingWidgetSchema.partial().optional(),
  goal: GoalWidgetSchema.partial().optional(),
  chat: ChatWidgetSchema.partial().optional(),
  /** Every image, sound and backdrop the styles point at, base64 by name, so
   *  the file is the whole look rather than a set of references to files only
   *  this machine has. */
  media: z.record(z.string(), z.string()).optional(),
});
export type StyleFile = z.infer<typeof StyleFileSchema>;

/** The three fields anywhere in a sheet that name a file. */
type Referring = { image?: string | null; sound?: string | null; backgroundMedia?: string | null };
const MEDIA_FIELDS = ["image", "sound", "backgroundMedia"] as const;

function mediaNames(file: StyleFile): string[] {
  const referring: (Referring | undefined)[] = [
    ...Object.values(file.styles ?? {}),
    file.nowPlaying,
    file.goal,
    file.chat,
  ];
  const names = referring.flatMap((entry) => MEDIA_FIELDS.map((field) => entry?.[field]));
  return [...new Set(names.filter((name): name is string => Boolean(name)))];
}

/** Pulls in the bytes of everything the sheet points at, so it can be handed
 *  to someone whose install has none of those files. */
export async function embedMedia(file: StyleFile): Promise<StyleFile> {
  const media: Record<string, string> = {};
  for (const name of mediaNames(file)) {
    const response = await fetch(mediaUrl(name));
    // A file deleted by hand is not worth failing the whole export over: the
    // style keeps the name, and the import will simply find nothing.
    if (response.ok) media[name] = await toBase64(await response.blob());
  }
  return { ...file, media };
}

/** Writes embedded media into this install's media dir and repoints the styles
 *  at the names it got back - the backend names files itself. */
export async function restoreMedia(file: StyleFile): Promise<StyleFile> {
  const renamed = new Map<string, string>();
  for (const [name, data] of Object.entries(file.media ?? {})) {
    renamed.set(name, await alertsService.importMedia(await fromBase64(data, name)));
  }
  if (renamed.size === 0) return file;

  // Only fields that are actually present are touched: writing `image:
  // undefined` into a patch would clear an image the streamer already had.
  const repoint = <T extends Referring>(entry: T): T => {
    const next: Referring = { ...entry };
    for (const field of MEDIA_FIELDS) {
      const name = next[field];
      if (typeof name === "string" && renamed.has(name)) next[field] = renamed.get(name);
    }
    return next as T;
  };

  return {
    ...file,
    media: undefined,
    styles:
      file.styles &&
      (Object.fromEntries(
        Object.entries(file.styles).map(([kind, style]) => [kind, repoint(style)]),
      ) as StyleFile["styles"]),
    nowPlaying: file.nowPlaying && repoint(file.nowPlaying),
    goal: file.goal && repoint(file.goal),
    chat: file.chat && repoint(file.chat),
  };
}

/** The webview's own download, so no file-system permission is needed. */
export function downloadStyleFile(file: StyleFile) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `hibiki-styles-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Throws on anything that is not one of ours - the file came from outside. */
export async function readStyleFile(file: File): Promise<StyleFile> {
  return StyleFileSchema.parse(JSON.parse(await file.text()));
}
